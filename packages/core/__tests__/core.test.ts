import { createConnection, SelectionSet, getRepository } from '../lib';
import { Post } from './entities/post';
import { User } from './entities/user';
import { graphql, GraphQLResolveInfo } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
async function bootstrap() {
    await createConnection({
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
    post.authorUid = 1;
    post.likeUsers = [user];
    Post.findAndCount()

    const schema = makeExecutableSchema({
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
                userList: async (
                    source: any,
                    variables: any,
                    context: any,
                    info: GraphQLResolveInfo
                ) => {
                    const values = info.variableValues;
                    return {
                        count: async (
                            source: any,
                            args: any,
                            info: GraphQLResolveInfo
                        ) => {
                            return 10;
                        },
                        list: async (
                            source: any,
                            args: any,
                            info: GraphQLResolveInfo
                        ) => {
                            const sets = SelectionSet.fromGraphql(info, {}, {}, {});
                            const obj = [];
                            await Promise.all(sets.map(async set => {
                                const condiction = SelectionSet.createWhere({
                                    id_between: [0, 10]
                                });
                                const where = {
                                    select: set.selections as any,
                                    relations: set.relations,
                                    where: condiction,
                                    order: {}
                                }
                                let res = await getRepository(User).find(where);
                                let result = [];
                                await Promise.all(set.actions.map(async action => {
                                    await Promise.all(res && res.map(async li => {
                                        li[action.name] = await li[action.name](action.args);
                                        result.push(li);
                                    }))
                                }));
                                if (result && result.length)
                                    obj.push(...result)
                            }));
                            return obj;
                        }
                    }
                }
            }
        }
    })
    return await graphql({
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