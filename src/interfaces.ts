import { Request, Response } from "express"

export interface JWTUser {
    id: string
    username: string
}

export interface GraphqlContext {
    user?: JWTUser 
    req: Request
    res: Response
}