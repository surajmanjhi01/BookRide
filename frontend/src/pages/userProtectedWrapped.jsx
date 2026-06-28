import React ,{useContext}from 'react'
import { useNavigate } from 'react-router-dom'
import { UserDataContext } from '../context/userContext.jsx'

const UserProtectedWrapped = ({children}) => {
    // const {user} = useContext(UserDataContext);
    const token = localStorage.getItem('user');
    const navigate = useNavigate();

    if (!token) {
        navigate('/login');
        return null;
    }

    return children;
};

export default UserProtectedWrapped;