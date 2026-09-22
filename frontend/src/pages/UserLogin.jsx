import React from "react";
import { Link } from "react-router-dom";
import { useState,useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserDataContext } from "../context/userContext.jsx";
import { clearRiderRideState } from "../constants/riderStorage";
import axios from "axios";
import API_BASE_URL from "../config";
import toast from "react-hot-toast";
import BrandMark from "../components/BrandMark";
import Loader from "../components/Loader";

const UserLogin = () => {
    const [email, setEmail] = useState("");
    const[password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [userData, setUserData] = useState({
        email: "",
        password: ""
    });
    const navigate=useNavigate();
    const {user,setUser}=React.useContext(UserDataContext)
    const submitHandler=async(e)=>{     
        e.preventDefault();
        
        // Prevent duplicate submissions while a login is in progress
        if (isLoading) return;
        
        setIsLoading(true);

       const UserData={
        email:email,
        password:password
       }
      try {
        const response=await axios.post(`${API_BASE_URL}/api/users/login`,UserData)
        if(response.status===200){
          const data=response.data 
          setUser(data.user);
          localStorage.setItem('user', data.token);
          clearRiderRideState();
          toast.success("Welcome back!");
          navigate('/home');
        }
      } catch (error) {
        const message = error.response?.status === 400
          ? "Invalid email or password."
          : "Unable to sign in. Please try again.";
        toast.error(message);
      } finally {
        setIsLoading(false);
        setEmail('');
        setPassword('');
      }
    }
  return (
    <div className="h-screen flex flex-col justify-between bg-white">
      
      {/* Top Section */}
      <div className="p-7">
        {/* Logo */}
        <BrandMark className="mb-10" />

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
            type="submit"
            disabled={isLoading}
            className={`bg-black text-white font-semibold mb-3 rounded px-4 py-3 w-full flex items-center justify-center gap-2 ${
              isLoading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? (
              <Loader size={18} color="#ffffff" label="Logging in..." />
            ) : (
              "Login"
            )}
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
          BookRide is an independent educational/demo project and is not affiliated with Uber.
        </p>
      </div>
    </div>
  );
};

export default UserLogin;