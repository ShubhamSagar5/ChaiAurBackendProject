import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const registerUser = asyncHandler( async (req, res) => {
    
    //get data from user
    const {username,email,fullName,password} = req.body 

    //check empty filed
    if(
        [username,email,fullName,password].some((filed)=>filed.trim() === "")
    ){
        throw new ApiError(404,"All fileds are required")
    }

    const existingUser = User.findOne({
        $or:[{username:username},{email:email}]
    })

    if(existingUser){
        throw new ApiError(409,"user Already register with same username and password")
    }
    
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverLocalPath = req.files?.coverLocalPath[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverLocalPath)

    if(!avatar){
        throw new ApiError(400,"avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage.url,
        email,
        username:username.toLowerCase()
    })

    const createdUser  = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while register the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Created Successfully")
    )
    
} )


export {
    registerUser,
}