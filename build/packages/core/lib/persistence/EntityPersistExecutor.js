"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MustBeEntityError_1 = require("../error/MustBeEntityError");
const SubjectExecutor_1 = require("./SubjectExecutor");
const CannotDetermineEntityError_1 = require("../error/CannotDetermineEntityError");
const Subject_1 = require("./Subject");
const OneToManySubjectBuilder_1 = require("./subject-builder/OneToManySubjectBuilder");
const OneToOneInverseSideSubjectBuilder_1 = require("./subject-builder/OneToOneInverseSideSubjectBuilder");
const ManyToManySubjectBuilder_1 = require("./subject-builder/ManyToManySubjectBuilder");
const SubjectDatabaseEntityLoader_1 = require("./SubjectDatabaseEntityLoader");
const CascadesSubjectBuilder_1 = require("./subject-builder/CascadesSubjectBuilder");
const OrmUtils_1 = require("../util/OrmUtils");
const PromiseUtils_1 = require("../util/PromiseUtils");
/**
 * Persists a single entity or multiple entities - saves or removes them.
 */
class EntityPersistExecutor {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection, queryRunner, mode, target, entity, options) {
        this.connection = connection;
        this.queryRunner = queryRunner;
        this.mode = mode;
        this.target = target;
        this.entity = entity;
        this.options = options;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Executes persistence operation ob given entity or entities.
     */
    execute() {
        // check if entity we are going to save is valid and is an object
        if (!this.entity || !(this.entity instanceof Object))
            return Promise.reject(new MustBeEntityError_1.MustBeEntityError(this.mode, this.entity));
        // we MUST call "fake" resolve here to make sure all properties of lazily loaded relations are resolved
        return Promise.resolve().then(async () => {
            // if query runner is already defined in this class, it means this entity manager was already created for a single connection
            // if its not defined we create a new query runner - single connection where we'll execute all our operations
            const queryRunner = this.queryRunner || this.connection.createQueryRunner("master");
            // save data in the query runner - this is useful functionality to share data from outside of the world
            // with third classes - like subscribers and listener methods
            if (this.options && this.options.data)
                queryRunner.data = this.options.data;
            try {
                // collect all operate subjects
                const entities = this.entity instanceof Array ? this.entity : [this.entity];
                const entitiesInChunks = this.options && this.options.chunk && this.options.chunk > 0 ? OrmUtils_1.OrmUtils.chunk(entities, this.options.chunk) : [entities];
                // console.time("building subject executors...");
                const executors = await Promise.all(entitiesInChunks.map(async (entities) => {
                    const subjects = [];
                    // create subjects for all entities we received for the persistence
                    entities.forEach(entity => {
                        const entityTarget = this.target ? this.target : entity.constructor;
                        if (entityTarget === Object)
                            throw new CannotDetermineEntityError_1.CannotDetermineEntityError(this.mode);
                        subjects.push(new Subject_1.Subject({
                            metadata: this.connection.getMetadata(entityTarget),
                            entity: entity,
                            canBeInserted: this.mode === "save",
                            canBeUpdated: this.mode === "save",
                            mustBeRemoved: this.mode === "remove"
                        }));
                    });
                    // console.time("building cascades...");
                    // go through each entity with metadata and create subjects and subjects by cascades for them
                    const cascadesSubjectBuilder = new CascadesSubjectBuilder_1.CascadesSubjectBuilder(subjects);
                    subjects.forEach(subject => {
                        // next step we build list of subjects we will operate with
                        // these subjects are subjects that we need to insert or update alongside with main persisted entity
                        cascadesSubjectBuilder.build(subject);
                    });
                    // console.timeEnd("building cascades...");
                    // load database entities for all subjects we have
                    // next step is to load database entities for all operate subjects
                    // console.time("loading...");
                    await new SubjectDatabaseEntityLoader_1.SubjectDatabaseEntityLoader(queryRunner, subjects).load(this.mode);
                    // console.timeEnd("loading...");
                    // console.time("other subjects...");
                    // build all related subjects and change maps
                    if (this.mode === "save") {
                        new OneToManySubjectBuilder_1.OneToManySubjectBuilder(subjects).build();
                        new OneToOneInverseSideSubjectBuilder_1.OneToOneInverseSideSubjectBuilder(subjects).build();
                        new ManyToManySubjectBuilder_1.ManyToManySubjectBuilder(subjects).build();
                    }
                    else {
                        subjects.forEach(subject => {
                            if (subject.mustBeRemoved) {
                                new ManyToManySubjectBuilder_1.ManyToManySubjectBuilder(subjects).buildForAllRemoval(subject);
                            }
                        });
                    }
                    // console.timeEnd("other subjects...");
                    // console.timeEnd("building subjects...");
                    // console.log("subjects", subjects);
                    // create a subject executor
                    return new SubjectExecutor_1.SubjectExecutor(queryRunner, subjects, this.options);
                }));
                // console.timeEnd("building subject executors...");
                // make sure we have at least one executable operation before we create a transaction and proceed
                // if we don't have operations it means we don't really need to update or remove something
                const executorsWithExecutableOperations = executors.filter(executor => executor.hasExecutableOperations);
                if (executorsWithExecutableOperations.length === 0)
                    return;
                // start execute queries in a transaction
                // if transaction is already opened in this query runner then we don't touch it
                // if its not opened yet then we open it here, and once we finish - we close it
                let isTransactionStartedByUs = false;
                try {
                    // open transaction if its not opened yet
                    if (!queryRunner.isTransactionActive) {
                        if (!this.options || this.options.transaction !== false) { // start transaction until it was not explicitly disabled
                            isTransactionStartedByUs = true;
                            await queryRunner.startTransaction();
                        }
                    }
                    // execute all persistence operations for all entities we have
                    // console.time("executing subject executors...");
                    await PromiseUtils_1.PromiseUtils.runInSequence(executorsWithExecutableOperations, executor => executor.execute());
                    // console.timeEnd("executing subject executors...");
                    // commit transaction if it was started by us
                    // console.time("commit");
                    if (isTransactionStartedByUs === true)
                        await queryRunner.commitTransaction();
                    // console.timeEnd("commit");
                }
                catch (error) {
                    // rollback transaction if it was started by us
                    if (isTransactionStartedByUs) {
                        try {
                            await queryRunner.rollbackTransaction();
                        }
                        catch (rollbackError) { }
                    }
                    throw error;
                }
            }
            finally {
                // release query runner only if its created by us
                if (!this.queryRunner)
                    await queryRunner.release();
            }
        });
    }
}
exports.EntityPersistExecutor = EntityPersistExecutor;
