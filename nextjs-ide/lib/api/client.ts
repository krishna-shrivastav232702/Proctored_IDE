import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
    baseURL:API_BASE_URL,
    headers:{
        'Content-Type':'application/json'
    },
    timeout:30000,
})

apiClient.interceptors.request.use((config:InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if(token && config.headers){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
},(error) =>{
    return Promise.reject(error);
})




export default apiClient;