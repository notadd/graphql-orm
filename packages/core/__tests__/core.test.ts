import { createConnection } from '../lib';
import { Post } from './entities/post';
import { User } from './entities/user';
import { OperationDefinitionNode, SelectionNode, parse, SelectionSetNode, FieldNode, FragmentSpreadNode, InlineFragmentNode } from 'graphql';
export function isFieldNode(obj: SelectionNode): obj is FieldNode {
    return obj.kind === 'Field'
}
export function isFragmentSpreadNode(obj: SelectionNode): obj is FragmentSpreadNode {
    return obj.kind === 'FragmentSpread'
}
export function isInlineFragmentNode(obj: SelectionNode): obj is InlineFragmentNode {
    return obj.kind === 'InlineFragment'
}

export class SelectionSet {
    parent: SelectionSet;
    children: SelectionSet[] = [];
    name: string;
    level: number = 0;

    selections: string[] = [];
    relations: string[] = [];

    constructor(name: string, obj: SelectionSetNode, level: number = 0, parent?: SelectionSet) {
        this.name = name;
        this.parent = parent;
        this.level = level;
        if (obj) {
            obj.selections && obj.selections.map(selection => {
                if (isFieldNode(selection)) {
                    this.create(selection.name.value, selection.selectionSet)
                }
            })
        }
    }

    getTop(): SelectionSet {
        if (this.parent) return this.parent.getTop();
        return this;
    }

    addSelect(select: string): void {
        const top = this.getTop();
        const item = top.selections.find(re => re === select)
        if (!item) {
            top.selections.push(select)
        }
    }
    addRelation(relation: string): void {
        const top = this.getTop();
        const item = top.relations.find(re => re === relation)
        if (!item) {
            top.relations.push(relation)
        }
    }

    hasChildren(): boolean {
        return this.children.length > 0;
    }

    toRelation(): string[] {
        let relation = [];
        if (this.level !== 0) {
            if (this.parent) {
                relation.push(...this.parent.toRelation())
            }
            relation.push(this.name)
        }
        if (this.hasChildren()) {
            if (relation.length > 0) this.addRelation(relation.join('.'))
        } else {
            if (relation.length === 1) this.addSelect(relation.join('.'))
        }
        return relation;
    }

    toRelations() {
        if (this.level === 0) {
            this.children.map(child => child.toRelations())
        } else {
            this.toRelation();
            this.children.map(child => child.toRelations());
        }
    }

    create(name: string, obj: SelectionSetNode) {
        this.children.push(new SelectionSet(name, obj, this.level + 1, this));
    }

    static fromJson(name: string, obj: SelectionSetNode) {
        return new SelectionSet(name, obj)
    }
}


async function bootstrap() {
    const connection = await createConnection({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'magnus',
        username: 'default',
        password: 'secret',
        entities: [
            User,
            Post
        ],
        synchronize: true
    });
    const user = new User();
    user.id = 2;
    await user.save();
    const post = new Post();
    post.createUserId = 1;
    post.likeUsers = [user];

    const def = {
        userList: async (select: any, relations: string[], where: any = {}, order: any = {}, skip: number = 0, take: 20) => {
            return await User.findAndCount({
                select,
                where,
                order,
                relations,
                skip,
                take
            });
        },
        postList: async (select: any, relations: string[], where: any = {}, order: any = {}, skip: number = 0, take: 20) => {
            return await Post.findAndCount({
                select,
                where,
                order,
                relations,
                skip,
                take
            });
        },
    }
    const ast = parse(`query {
        userList {
            id,
            posts {
                id,
                createUser{
                    id
                }
            }
        }
        postList {
            id,
            createUser{
                id
            },
            likeUsers{
                id,
                posts {
                    id
                }
            }
        }
    }`);
    const operation = ast.definitions[0] as OperationDefinitionNode;
    let result = {};
    await Promise.all(operation.selectionSet.selections.map(async selection => {
        if (isFieldNode(selection)) {
            let set = SelectionSet.fromJson(selection.name.value, selection.selectionSet);
            set.toRelations();
            const users = await def[set.name](set.selections, set.relations);
            result[set.name] = users;
            return set;
        }
    }));
    debugger;
}

bootstrap();