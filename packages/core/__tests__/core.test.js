"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const post_1 = require("./entities/post");
const user_1 = require("./entities/user");
const graphql_1 = require("graphql");
const graphql_tools_1 = require("graphql-tools");
async function bootstrap() {
    await lib_1.createConnection({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'magnus',
        username: 'default',
        password: 'secret',
        entities: [
            user_1.User,
            post_1.Post
        ],
        synchronize: true
    });
    const user = new user_1.User();
    user.id = 2;
    await user.save();
    const post = new post_1.Post();
    post.authorUid = 1;
    post.likeUsers = [user];
    post_1.Post.findAndCount();
    const schema = graphql_tools_1.makeExecutableSchema({
        typeDefs: `
        type Post{
            id: Int
            author: User
        }
        type User {
            id: Int
            get(id: Int): User
            posts: [Post]
        }
        type UserList{
            count: Int
            list: [User]
        }
        type Query {
        userList: UserList
      }`,
        resolvers: {
            Query: {
                userList: async (source, variables, context, info) => {
                    const values = info.variableValues;
                    return {
                        count: async (source, args, info) => {
                            return 10;
                        },
                        list: async (source, args, info) => {
                            const sets = lib_1.SelectionSet.fromGraphql(info, {}, {}, {}, {});
                            const obj = [];
                            await Promise.all(sets.map(async (set) => {
                                const condiction = lib_1.SelectionSet.createWhere({
                                    id_between: [0, 10]
                                });
                                const where = {
                                    select: set.selections,
                                    relations: set.relations,
                                    where: condiction,
                                    order: {}
                                };
                                let res = await lib_1.getRepository(user_1.User).find(where);
                                let result = [];
                                await Promise.all(set.actions.map(async (action) => {
                                    await Promise.all(res && res.map(async (li) => {
                                        li[action.name] = await li[action.name](action.args);
                                        result.push(li);
                                    }));
                                }));
                                if (result && result.length)
                                    obj.push(...result);
                            }));
                            return obj;
                        }
                    };
                }
            }
        }
    });
    return await graphql_1.graphql({
        schema,
        source: `query getList($id: Int){ 
        userList {
            count,
            list {
                id,
                get(id: $id){
                    id
                },
                posts {
                    id,
                    author{
                        id
                    }
                }
            }
        }}`,
        rootValue: {},
        contextValue: {},
        variableValues: {
            id: 1
        },
        operationName: ``
    }).then(res => {
        if (res.errors) {
            throw new Error(`${res.errors.join("\n")}`);
        }
        return res.data;
    });
}
bootstrap().then(res => {
    debugger;
});
//# sourceMappingURL=core.test.js.map