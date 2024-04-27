import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

const verifyJwtToken = async(req,res,next) => {
    try{

        const token = req.cookies?.accessToken || req.header("Authorization").replace("Bearer ","") 

        if(!token){
            res.status(401).json({
                success:false,
                message:"Token not found"
            })
        }

        const decodeToken =  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        
        const user  = await User.findById(decodeToken?._id).select("-password -refreshToken")
        if(!decodeToken){
            res.status(401).json({
                success:false,
                message:"decode not found"
            })
        }

        req.user = user
        next()

    }catch(error){
        res.status(500).json({
            success:false,
            message:"something went wrong during verify JWT Token"
        })
    }
}

export default verifyJwtToken