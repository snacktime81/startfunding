import {RequestHandler, Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {FieldPacket} from 'mysql2/promise';
import { user, item } from '../types/model';

import pool from "../models/db";

const renderItem: RequestHandler = (req : Request, res: Response) => {
	res.render('item');
}

const postItem: RequestHandler = async(req: Request, res: Response, next: NextFunction) => {
	try{

		const {name, price, percent, deadline, image, describe} = req.body;
		let query = "INSERT INTO ITEM(user_id, name, price, percent, explanation, img, deadline) VALUES(?, ?, ?, ?, ?, ?, ?) ";
		
		const accessToken: string = req.cookies.accessToken;
		const user: any = jwt.verify(accessToken, process.env.ACCESS_SECRET || '');
		//console.log(user);
		const userId = user.id;
		
		
		const data = [userId, name, price, percent, describe, image, deadline];
		
		await pool.query(query, data);
		res.redirect('/item');
	}
	catch(err){
		console.error(err);
	}
}

const renderItemList: RequestHandler = async(req : Request, res: Response) => {

	let query = "SELECT * FROM ITEM";

	const [rows, fields]: [item[], FieldPacket[]] = await pool.query(query);
    const items = rows;

	res.render('itemList', {items: items});
}

const renderItemId: RequestHandler = async(req: Request, res: Response) => {
	
	const {id} = req.params;
	
	let query = 'SELECT * FROM ITEM WHERE id = (?)';
	const dataId = [id];

	const [items, fields]:[item[], FieldPacket[]] = await pool.query(query, dataId);
	const item = items[0];

	query = "UPDATE ITEM SET views = views + 1 WHERE ID = (?)";
	
	await pool.query(query, dataId);
	
	res.render('itemDetail', {item});
}

const postOrder: RequestHandler = async(req, res) => {
	try{
		const purchasePercent = req.body.purchasePercent as number;
		const itemId = req.body.itemId as number;
		const price = req.body.price;
		const priceNumber = (price.substring(0, price.length-1)) as number;
		
		//console.log(typeof purchasePercent, typeof itemId, typeof price);
		
		let query = "SELECT user_id FROM ITEM WHERE id = ?";
		let data = [itemId];

		const [userIds, fields]: [Omit<user, "email" | "name" | "password" | "authority">, FieldPacket[]] = await pool.query(query, data);

		const userId = userIds[0].user_id;

		query = "INSERT INTO `ORDER`(idea_id, user_id, purchase_percent, price) VALUES(?, ?, ?, ?)";
		data = [itemId, userId, purchasePercent, priceNumber];

		await pool.query(query, data);
		res.status(200);
	}
	catch(err){
		console.log(err);
	}
}

export {renderItem, postItem, renderItemList, renderItemId, postOrder};