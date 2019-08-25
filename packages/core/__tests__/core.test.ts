import { createConnection, SelectionSet } from '../lib';
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
    post.createUserId = 1;
    post.likeUsers = [user];
    const schema = makeExecutableSchema({
        typeDefs: `
        type Hello{
            nickname: String
        }
        type Query {
        hello(name: String): Hello
      }`,
        resolvers: {
            Query: {
                hello: (
                    source: any,
                    args: any,
                    context: any,
                    info: GraphQLResolveInfo
                ) => {
                    const set = SelectionSet.fromGraphql(args, info);
                    debugger;
                    return {
                        nickname: `hello`
                    }
                }
            }
        }
    })
    return await graphql({
        schema,
        source: `{ demo: hello(name: "name"){
            demoNickname: nickname
        }}`,
        rootValue: {},
        contextValue: {},
        variableValues: {},
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