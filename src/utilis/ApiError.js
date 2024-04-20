class ApiError extends Error {
    constructor(statusCode,message ="Something went wrong",error =[],stack =""){
        super(message)
        this.statusCode = statusCode
        this.data = null 
        this.message = message
        this.success = false
        this.errors = errors
    
        
        if (stack) {
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }
    
    }
}

export {ApiError} 



const createApiError = (statusCode, message = "Something went wrong", errors = [], stack = "") => {
    const instance = new Error(message);
    instance.statusCode = statusCode;
    instance.data = null;
    instance.message = message;
    instance.success = false;
    instance.errors = errors;

    if (stack) {
        instance.stack = stack;
    } else {
        Error.captureStackTrace(instance, ApiError);
    }

    return instance;
};

export { createApiError };