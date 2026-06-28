import React, { useState } from "react";
import { Link ,useNavigate} from "react-router-dom";
import axios from "axios";
import {UserDataContext} from "../context/userContext";

const UserSignup = () => {
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();
const {user,setUser}=React.useContext(UserDataContext)
  const submitHandler = async(e) => {
    e.preventDefault();

    const newUser = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
    };
    setUserData({
      name: "",
      email: "",
      password: "",
    });
     const response=await axios.post(`${import.meta.env.VITE_BASE_URL}/api/users/register`,newUser)
     if(response.status===201){
        const data=response.data
    setUser(data.user)
    localStorage.setItem('user', data.token);
      navigate('/home');
     }
  };

  return (
    <div className="h-screen flex flex-col justify-between bg-white">
      {/* Top Section */}
      <div className="p-7">
        {/* Uber Logo */}
        <img
          className="w-16 mb-10"
          src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
          alt="Uber Logo"
        />

        <form onSubmit={submitHandler}>
          {/* Name */}
          <h3 className="text-xl font-medium mb-2">
            What's your name?
          </h3>

          <input
            required
            value={userData.name}
            onChange={(e) =>
              setUserData({ ...userData, name: e.target.value })
            }
            type="text"
            placeholder="John Doe"
            className="bg-[#eeeeee] mb-7 rounded px-4 py-3 border w-full text-lg placeholder:text-gray-500 focus:outline-none"
          />

          {/* Email */}
          <h3 className="text-xl font-medium mb-2">
            What's your email?
          </h3>

          <input
            required
            value={userData.email}
            onChange={(e) =>
              setUserData({ ...userData, email: e.target.value })
            }
            type="email"
            placeholder="email@example.com"
            className="bg-[#eeeeee] mb-7 rounded px-4 py-3 border w-full text-lg placeholder:text-gray-500 focus:outline-none"
          />

          {/* Password */}
          <h3 className="text-xl font-medium mb-2">
            Choose Password
          </h3>

          <input
            required
            value={userData.password}
            onChange={(e) =>
              setUserData({ ...userData, password: e.target.value })
            }
            type="password"
            placeholder="Password"
            className="bg-[#eeeeee] mb-7 rounded px-4 py-3 border w-full text-lg placeholder:text-gray-500 focus:outline-none"
          />

          <button
            type="submit"
            className="bg-black text-white font-semibold rounded px-4 py-3 w-full mb-3"
          >
            Create Account
          </button>

          <p className="text-center text-sm">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-medium"
            >
              Login
            </Link>
          </p>
        </form>
      </div>

      {/* Bottom Section */}
      <div className="p-7">
        <Link
          to="/captain-signup"
          className="flex items-center justify-center bg-[#10B461] text-white font-semibold rounded px-4 py-3 w-full"
        >
          Register as Captain
        </Link>

        <p className="text-xs text-center text-gray-500 mt-5 leading-5">
          By proceeding, you agree to Uber's Terms of Use and acknowledge that
          you have read the Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default UserSignup;