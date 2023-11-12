import express from 'express';
import{
	renderMainNotLoggedIn, renderLogin, renderJoin, renderMainLoggedIn, logout, renderProfile, renderUser
} from '../controllers/page';

import{
	loginAuth, isLoggedIn, isNotLoggedIn, refreshToken, tokenCheck
} from '../controllers/auth';

const router = express.Router();

router.get('/', isNotLoggedIn, refreshToken, renderMainNotLoggedIn);
router.get('/', isLoggedIn, renderMainLoggedIn);


router.get('/login', renderLogin);
router.get('/join', renderJoin);
router.get('/logout', logout);

router.get('/profile', tokenCheck, renderProfile);


router.get('/:id', tokenCheck, renderUser)


export default router;