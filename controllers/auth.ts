import {RequestHandler, Request, Response, NextFunction} from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { FieldPacket } from "mysql2/promise";
import pool from "../models/db";

import {user, reqBody} from "../types/model";
import { redisCli } from '../src/app';
import { makeJwt } from "../func/token";

dotenv.config();

const postUser: RequestHandler = async(req: Request, res: Response) => {
	try{
		const {name, email, password}: reqBody = req.body;
		let query = "SELECT id FROM USER WHERE email = (?)";
		let data = [email];

		const [rows, fields] : [user[], FieldPacket[]] = await pool.query(query, data);
		const exUser = rows[0];

		if(exUser){
			res.status(409);
			return res.send(
				  `<script>
					alert('이미 존재하는 email입니다.');
					location.href='/login';
				  </script>`
				);
		}
		const hash = await bcrypt.hash(password, 12);
		
		query = "INSERT INTO USER (email, name, password) VALUES (?, ?, ?)";
		data = [email, name, hash];
		
		await pool.query(query, data);

		query = "SELECT id FROM USER WHERE email=?"
		const [row, field] : [user[], FieldPacket[]] = await pool.query(query, [email]);
		const newUser = row[0];
		const accessSecret: string = process.env.ACCESS_SECRET || " ";

		const accessToken: string = makeJwt(newUser.id, accessSecret, 18000);

		const refreshSecret: string = process.env.REFRESH_SECRET || " ";

		const refreshToken: string = makeJwt(newUser.id, refreshSecret, 604800)

		res.cookie('accessToken', accessToken, {
			secure: false,
			httpOnly: true,
		})

		res.cookie('refreshToken', refreshToken, {
			secure: true,
			httpOnly: true,
		})

		const tokenName : string = `refreshToken${newUser.id}`;
		await redisCli.set(tokenName, refreshToken);
		await redisCli.sendCommand(['EXPIRE', tokenName, '604800']);

		res.status(201).redirect('/');
	}
	catch(err){
		res.status(500)
		console.error(err);
	}
}

const putUser: RequestHandler = async(req, res) => {
	try{
		const {name, password}: reqBody = req.body;
		const hash = await bcrypt.hash(password, 12);

		const id = req.params.id

		const query = "UPDATE USER SET name = (?), password = (?) WHERE ID = (?)";
		const data = [name, hash, id];

		await pool.query(query, data);
		//res.status(303).redirect(`/`);
		res.json(`/${id}`);
	}
	catch(err){
		res.status(500);
		console.log(err);
	}
}

const deleteUser: RequestHandler = async(req, res) => { 
	try{
		const {password}: Pick<reqBody, 'password'> = req.body;
	
		const id = req.params.id;

		const data = [id];
		let query = "SELECT * FROM USER WHERE ID = (?);";

		const [rows, fields] : [user[], FieldPacket[]] = await pool.query(query, data);
		const origianlPw = rows[0].password;
		if(bcrypt.compareSync(password, origianlPw)){
			res.cookie('accessToken', '')
			res.cookie('refreshToken', '')
			const tokenName = `refreshToken${id}`;
			await redisCli.del(tokenName);

			query = "DELETE FROM USER WHERE ID = (?);";
			await pool.query(query, data);
			res.status(303);
			return res.json('/');
		} else{
			res.status(400);
			res.json(`${id}`);
		}

	}
	catch(err){
		res.status(500)
		console.log(err)
	}
}

const postLogin: RequestHandler = async(req: Request, res: Response) => {
	try{
		
		const {email, password}: Omit<reqBody, 'name'> = req.body;

		let query = "SELECT * FROM USER WHERE email = (?)";
		let data = [email];

		const [rows, fields] : [user[], FieldPacket[]] = await pool.query(query, data);
		const exUser = rows[0];
		//console.log('exuer', exUser)

		if(!exUser){
			res.status(409);
			return res.send(
				  `<script>
					alert('없는 계정입니다.');
					location.href='/login';  
				  </script>`
				);
		}

		if(bcrypt.compareSync(password, exUser.password)){
			
			const accessSecret: string = process.env.ACCESS_SECRET || " ";

			const accessToken: string = makeJwt(exUser.id, accessSecret, 18000);

			const refreshSecret: string = process.env.REFRESH_SECRET || " ";

			const refreshToken: string = makeJwt(exUser.id, refreshSecret, 604800);

			res.cookie('accessToken', accessToken, {
				secure: false,
				httpOnly: true,
			});
			res.cookie('refreshToken', refreshToken, {
				secure: false,
				httpOnly: true,
			});

			const tokenName = `refreshToken${exUser.id}`;
			redisCli.set(tokenName, refreshToken);
			await redisCli.sendCommand(['EXPIRE', tokenName, '604800']);

			res.status(303).redirect('/');
		} else{
			res.status(409);
			return res.send(
				  `<script>
					alert('비밀번호가 잘못되었습니다.');
					location.href='/login';  
				  </script>`
				);
		}
	}
	catch(err){
		res.status(500);
		console.error(err);
	}
}


export {postUser, postLogin, putUser, deleteUser};