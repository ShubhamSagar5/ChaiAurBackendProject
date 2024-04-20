class ApiResponse {
    constructor(statusCode,data,message="Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}


export { ApiResponse } 


const createApiResponse = (statusCode, data, message = "Success") => {
    const success = statusCode < 400;
    return {
        statusCode:statusCode,
        data:data,
        message:message,
        success:success
    };
};

export { createApiResponse };