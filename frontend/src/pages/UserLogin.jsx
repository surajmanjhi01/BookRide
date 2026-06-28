import React from "react";
import { Link } from "react-router-dom";
import { useState,useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserDataContext } from "../context/userContext.jsx";
import axios from "axios";

const UserLogin = () => {
    const [email, setEmail] = useState("");
    const[password, setPassword] = useState("");
    const [userData, setUserData] = useState({
        email: "",
        password: ""
    });
    const navigate=useNavigate();
    const {user,setUser}=React.useContext(UserDataContext)
    const submitHandler=async(e)=>{     
        e.preventDefault();
       
       const UserData={
        email:email,
        password:password
       }
      const response=await axios.post(`${import.meta.env.VITE_BASE_URL}/api/users/login`,UserData)
      if(response.status===200){
        const data=response.data 
        console.log(data.user)
        setUser(data.user);
        localStorage.setItem('user', data.token);
        navigate('/home');
      }
        setEmail('');
        setPassword('');
    }
  return (
    <div className="h-screen flex flex-col justify-between bg-white">
      
      {/* Top Section */}
      <div className="p-7">
        {/* Logo */}
        <img
          className="w-16 mb-10"
          src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
          alt="Uber Logo"
        />

        <form onSubmit={(e)=>submitHandler(e)}>
          <h3 className="text-xl font-medium mb-2">
            What's your email?
          </h3>

          <input
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="email@example.com"
            className="bg-[#eeeeee] mb-7 rounded px-4 py-3 border w-full text-lg placeholder:text-gray-500 focus:outline-none"
          />

          <h3 className="text-xl font-medium mb-2">
            Enter Password
          </h3>

          <input
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="bg-[#eeeeee] mb-7 rounded px-4 py-3 border w-full text-lg placeholder:text-gray-500 focus:outline-none"
          />

          <button
            className="bg-black text-white font-semibold mb-3 rounded px-4 py-3 w-full"
          >
            Login
          </button>

          <p className="text-center text-sm">
            New here?{" "}
            <Link
              to="/signup"
              className="text-blue-600 font-medium"
            >
              Create New Account
            </Link>
          </p>
        </form>
      </div>

      {/* Bottom Section */}
      <div className="p-7">
        <Link
          to="/captain-login"
          className="flex items-center justify-center bg-[#10B461] text-white font-semibold rounded px-4 py-3 w-full"
        >
          Sign in as Captain
        </Link>
        <p className="text-xs text-gray-500 text-center mt-5 leading-5">
          By proceeding, you agree to Uber's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default UserLogin;