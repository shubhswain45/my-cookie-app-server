import express, { Request, Response } from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { GraphqlContext } from '../interfaces';
import JWTService from '../services/JWTService';

export async function initServer() {
    const app = express();

    // CORS configuration
    const corsOptions = {
        origin: ['https://my-cookie-app-client.vercel.app'], // your frontend URL
        credentials: true, // Ensure cookies are sent with cross-origin requests
    };

    // Use CORS middleware
    app.use(cors(corsOptions));
    app.use(bodyParser.json({ limit: "10mb" }));
    app.use(cookieParser());

    const graphqlServer = new ApolloServer<GraphqlContext>({
        typeDefs: `
            type Query {
                sayHello: String!
                currentUser: Boolean!
            }

            type Mutation {
                setCookie(username: String!, userId: String!): String!
            }
        `,
        resolvers: {
            Query: {
                sayHello: () => {
                    return "Hello";
                },
                currentUser:(_: unknown, args: any, context: GraphqlContext) => {
                    if(context.user){
                        return true
                    } else {
                        return false
                    }
                } 
            },
            Mutation: {
                setCookie: (_: unknown, args: { username: string; userId: string }, context: GraphqlContext) => {
                    const { res } = context;
                    const { username, userId } = args;

                    const token = JWTService.generateTokenForUser({id: userId, username})

                    // Set the cookie
                    res.cookie("your_token", token, {
                        httpOnly: true, // Secure the cookie to prevent JavaScript access
                        secure: true,
                        maxAge: 3600000, // Default 1 hour if maxAge not provided
                        sameSite: 'none', // Prevent CSRF attacks
                    });

                    return token
                },
            },
        },
    });

    await graphqlServer.start();

    // GraphQL Middleware
    app.use(
        '/graphql',
        // @ts-ignore
        expressMiddleware(graphqlServer, {
            context: async ({ req, res }: { req: Request; res: Response }): Promise<GraphqlContext> => {
                // Retrieve token from cookies
                let token = req.cookies["your_token"];
        
                // Fallback to Authorization header if cookie is not set
                if (!token && req.headers.authorization) {
                    token = req.headers.authorization.split("Bearer ")[1];
                }
        
                let user;
                if (token) {
                    try {
                        // Decode the token to retrieve user information
                        user = JWTService.decodeToken(token);
                        console.log("Decoded user:", user);
                    } catch (error) {
                        console.error("Error decoding token:", error);
                    }
                }
        
                return {
                    user,
                    req,
                    res,
                };
            },
        })
        
    );

    return app;
}
