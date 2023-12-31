import {RequestHandler, Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {FieldPacket} from 'mysql2/promise';

import {verify, isExpired} from '../func/token';
import { NoMatchId } from '../types/error';
import {payload} from "../types/model";
import { item } from '../types/model';
import pool from "../models/db";


const tokenCheck: RequestHandler = (req, res, next) => {
	try{
		const accessToken: string = req.cookies.accessToken;
		const refreshToken: string = req.cookies.refreshToken;

		const accessSecret = process.env.ACCESS_SECRET || '';
		const refreshSecret = process.env.REFRESH_SECRET ||'';

		if(accessToken === undefined){ // undefined즉 accessToken이 존재하지 않을때
			res.status(401);
			return res.send("<script>alert('로그인이 필요한 페이지 입니다.');location.href='/login';</script>");
		}

		const accessData : payload | 'expired' = verify(accessToken, accessSecret) as payload | 'expired';
		const refreshData : payload | 'expired' = verify(refreshToken, refreshSecret) as payload | 'expired';

		if(isExpired(accessData)){ // accessToken이 만료 되었을 때
			if(isExpired(refreshData)){ // refreshToken 또한 만료 되었을 떄
				res.status(401).send("<script>alert('로그인이 필요한 페이지 입니다.');location.href='/login';</script>");
			}
			else{ // refreshToken으로 accessToken 재발급
				const accessToken: string = jwt.sign({
					id: refreshData.id,
					email: refreshData.email,
					name: refreshData.name,
				}, accessSecret, {
					expiresIn: '5m',
				});
				res.cookie('accessToken', accessToken, {
					secure: false,
					httpOnly: true,
				});
				next();
			}
		}
		else{ // accessToken이 남아있을떄
			if(isExpired(refreshData)){ // refreshToken이 만료되었을 때
				res.status(401).send("<script>alert('로그인이 필요한 페이지 입니다.');location.href='/login';</script>");
			}
			else{ // 로그인이 되어있는 상태
				next();
			}
		}
	}
	catch(err){
		res.status(500);
		console.log('tokenCheck error');
		const error = new Error(err as string);
		next(error);
	}
}

const idCheck: RequestHandler = (req, res, next) => {
	try{
		const accessToken: string = req.cookies.accessToken;
		const accessSecret = process.env.ACCESS_SECRET || '';

		const accessData : payload | 'expired' = verify(accessToken, accessSecret) as payload | 'expired';
		const userId: number = req.params.id as unknown as number;

		if(!isExpired(accessData)){ // 유효한 경우
			if(accessData.id == userId){
				next();
			}
			else{
				const error = new NoMatchId('권한이 없습니다.');
				throw(error);
			}
		}
		else{
			const error = new Error('로그인을 다시 해주세요');
			throw(error);
		}
		
	}
	catch(err){
		next(err);
	}
}

const itemIdToUserIdCheck: RequestHandler = async(req, res, next) => {
	try{
		const accessToken: string = req.cookies.accessToken;
		const accessSecret = process.env.ACCESS_SECRET || '';

		const accessData : payload | 'expired' = verify(accessToken, accessSecret) as payload | 'expired';
		const itemId: number = req.params.id as unknown as number;

		let query = 'SELECT ITEM.id AS item_id, USER.id as user_id, ITEM.name as item_name, price, percent, explanation, img, deadline, views, USER.name as user_name FROM ITEM INNER JOIN USER ON ITEM.user_ID = USER.id WHERE ITEM.ID = (?);';
		const [items, fields]:[item[], FieldPacket[]] = await pool.query(query, itemId);
		const item = items[0];

		if(!isExpired(accessData)){ // 유효한 경우
			if(accessData.id == item.user_id){
				next();
			}
			else{
				const error = new NoMatchId('권한이 없습니다.');
				throw(error);
			}
		}
		else{
			const error = new Error('로그인을 다시 해주세요');
			throw(error);
		}
		
	}
	catch(err){
		next(err);
	}
}
export {tokenCheck, idCheck, itemIdToUserIdCheck}