import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs"
import jwt from 'jsonwebtoken'


const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
   

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath 

    if(req.files?.coverImage){
        coverImageLocalPath =req.files?.coverImage[0]?.path
    }else{
        coverImageLocalPath=""
    }

    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    if (!coverImageLocalPath) {
        coverImageLocalPath =""
        // throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar?.url,
        coverImage: coverImage?.url  || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )


const generateToken = async(userId)=>{

    try {
        const user = await User.findById(userId)
        const generateAccessToken =  user.generateAccessToken()
        const generateRefreshToken =  user.generateRefreshToken()
    
        user.refreshToken = generateRefreshToken 
       await user.save({ validateBeforeSave: false })
    
        return {generateAccessToken,generateRefreshToken}
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Something went wrong while generating refresh and access token "+ error
        })
    }
}

const loginUser = async(req,res)=>{
    try {
        const {userName,email,password} = req.body 

        if(!userName && !email){
            return res.status(401).json({
                success:false,
                message:"UserName or Email one filed is required"
            })
        }
        if(!password){
            return res.status(401).json({
                success:false,
                message:"Password required"
            })
        }

        const user = await User.findOne({$or:[{userName},{email}]})

        if(!user){
            return res.status(404).json({
                success:"User Does Not exist"
            })
        }

        const isPasswordCorrect = await user.isPasswordCorrect(password)

        if(!isPasswordCorrect){
            return res.status(401).json({
                success:false,
                message:"Password is incorrect"
            })
        }

        const {generateAccessToken,generateRefreshToken} = await generateToken(user._id) 

        if(!generateAccessToken && !generateRefreshToken){
            return res.status(401).json({
                success:false,
                message:"Token is not generated"
            })
        }

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const option = {
            httpOnly:true,
            secure:true
        }

        return res.status(200).cookie("accessToken",generateAccessToken,option).cookie("refreshToken",generateRefreshToken,option).json({
            success:true,
            data:loggedInUser,
            message:"User Login Successfully"
        })

    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Something went wrong"
        })
    }
}


const logoutUser = async(req,res)=>{
    try {
        const user = req.user

        if(!user){
            return res.status(404).json({
                success:false,
                message:"Userdata not found"
            })
        }

        const id = user._id 
        
        const logoutUser = await User.findOneAndUpdate(id,{$unset:{refreshToken:1}},{new:true}).select("-password") 

        
        const option = {
            httpOnly:true,
            secure:true
        }


        return res.status(200).clearCookie("accessToken",option).clearCookie("refreshToken",option).json({
            success:true,
            data:logoutUser,
            message:"User logout successfully"
        })
        
    } catch (error) {
        res.status(500).json({
            success:false,
            message:error
        })
    }
}

const refreshAccessToken = async(req,res)=>{
    try {
        
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken 

        if(!refreshToken){
            return res.status(404).json({
                success:false,
                message:"Refresh Token Not Found"
            })
        }

        const decodeJWT = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodeJWT?._id) 

        if(refreshToken !== user?.refreshToken){
            return res.status(401).json({
                message:"Invalid Creaditial"
            })
        }

        const {generateAccessToken,generateRefreshToken} = await generateToken(user?._id)

        const option = {
            httpOnly:true,
            secure:true
        }

        return res.status(200).cookie("AccessToken",generateAccessToken,option).cookie("RefreshToken",generateRefreshToken,option).json({
            success:true,
            data:{
                accessToken:generateAccessToken,
                RefreshToken:generateRefreshToken
            },
            message:"refreshToken done"
        })


    } catch (error) {
        return res.status(500).json({
            success:false,
            message:error
        })
    }
}

const changePassword = async(req,res)=> {
    try {
        
        const {oldPassword ,newPassword,confirmPassword} = req.body 

        if(!oldPassword || !newPassword || !confirmPassword){
            return res.status(401).json({
                success:false,
                message:"All fileds are required"
            })
        }

        if(newPassword !== confirmPassword){
            return res.status(401).json({
                success:false,
                message:"newPassword and Confirm Password Not Match"
            })
        }
 

        const user  = await User.findById(req.user?._id) 

        const isPasswordCorrect = await user.isPasswordCorrect(newPassword)

        if(!isPasswordCorrect){
            return res.status(401).json({
                success:false,
                message:"Password Not Match"
            })
        }

       await user.save({validateBeforeSave:false})

       return res.status(200).json({
        success:true,
        message:"Password Change Successfully"
    })
    } catch (error) {
            return res.status(500).json({
                success:false,
                message:error
            })
    }
}

const getCurrentUser = async(req,res)=>{
    try {
        
        const user = req.user 

        return res.status(200).json({
            success:true,
            message:"Current User Deatils",
            data:user
        })

    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Something error occur while fetching the current user data " + error 
        })
    }
}


const updateAccountDeatils =  async(req,res)=>{
    try {
        
        const {fullName,email} = req.body

        if(!fullName || ! email){
            return res.status(401).json({
                success:false,
                message:"Full name and email is required" + error 
            })
        }
        const user = await User.findByIdAndUpdate(req.user?._id,{$set:{fullName:fullName,email:email}},{new:true}).select("-password")

        if(!user){
            return res.status(401).json({
                success:false,
                message:"Something error occur while fetching user and updating data" + error 
            })
        }

        return res.status(200).json({
            success:true,
            data:user,
            message:"Account updated"
        })


    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"Something error occur while fetching the current user data " + error 
        })
    }
}


const updateUserAvatar = async(req,res) => {

    try {
        
        const {avatarFilePath} = req.file?.path 

        if(!avatarFilePath){
            return res.status(404).json({
                success:false,
                message:"avatarFile Path Not Found"
            })
        }

        

        const avatar = await uploadOnCloudinary(avatarFilePath)

        if(!avatar.url){
            return res.status(404).json({
                success:false,
                message:"Avatar file not upload on cloudinary"
            })
        }

        const user = await User.findByIdAndUpdate(req.user?._id,
                                                    {$set:{
                                                        avatar:avatar.url
                                                    }},{new:true}).select("-password")
            
        return res.status(200).json({
            success:true,
            data:user,
            message:"Avatar update Successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:error
        })
    }

}

const updateUserCoverImage = async(req,res) => {

    try {
        
        const {coverFilePath} = req.file?.path 

        if(!coverFilePath){
            return res.status(404).json({
                success:false,
                message:"coverImageFile Path Not Found"
            })
        }

        

        const coverImage = await uploadOnCloudinary(coverFilePath)

        if(!coverImage.url){
            return res.status(404).json({
                success:false,
                message:"Cover file not upload on cloudinary"
            })
        }

        const user = await User.findByIdAndUpdate(req.user?._id,
                                                    {$set:{
                                                        coverImage:coverImage.url
                                                    }},{new:true}).select("-password")
            
        return res.status(200).json({
            success:true,
            data:user,
            message:"Cover Image update Successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:error
        })
    }

}


export {
    registerUser,loginUser,logoutUser,refreshAccessToken,changePassword,updateAccountDeatils,updateUserAvatar,updateUserCoverImage
}