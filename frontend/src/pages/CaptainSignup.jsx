import React, { useState } from "react";
import { Link } from "react-router-dom";
import {CaptainDataContext} from "../context/CaptainContext.jsx"
import{useNavigate} from "react-router-dom"
import axios from 'axios'
const CaptainSignup = () => {
  const navigate=useNavigate()
  const [captainData, setCaptainData] = useState({
    fullname: {
      firstname: "",
      lastname: "",
    },
    email: "",
    password: "",
    vehicle: {
      color: "",
      plate: "",
      capacity: "",
      vehicleType: "",
    },
  });
  const {captain,setCaptain}=React.useContext(CaptainDataContext)

  const submitHandler = async(e) => {
    e.preventDefault();

   

    setCaptainData({
      fullname: {
        firstname: "",
        lastname: "",
      },
      email: "",
      password: "",
      vehicle: {
        color: "",
        plate: "",
        capacity: "",
        vehicleType: "",
      },
    
    });
    const response=await axios.post(`${import.meta.env.VITE_BASE_URL}/api/captains/register`, captainData);
    if (response.status === 201) {
      const data = response.data;
      setCaptain(data.captain);
      localStorage.setItem('token', data.token);
      navigate('/captain-home');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white">
      {/* Top */}
      <div className="p-7">
        <img
          className="w-16 mb-8"
          src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
          alt="Uber"
        />

        <form onSubmit={submitHandler}>
          <h3 className="text-xl font-medium mb-2">First Name</h3>
          <input
            required
            value={captainData.fullname.firstname}
            onChange={(e) =>
              setCaptainData({
                ...captainData,
                fullname: {
                  ...captainData.fullname,
                  firstname: e.target.value,
                },
              })
            }
            type="text"
            placeholder="John"
            className="bg-[#eeeeee] mb-5 rounded px-4 py-3 border w-full"
          />

          <h3 className="text-xl font-medium mb-2">Last Name</h3>
          <input
            required
            value={captainData.fullname.lastname}
            onChange={(e) =>
              setCaptainData({
                ...captainData,
                fullname: {
                  ...captainData.fullname,
                  lastname: e.target.value,
                },
              })
            }
            type="text"
            placeholder="Doe"
            className="bg-[#eeeeee] mb-5 rounded px-4 py-3 border w-full"
          />

          <h3 className="text-xl font-medium mb-2">Email</h3>
          <input
            required
            value={captainData.email}
            onChange={(e) =>
              setCaptainData({
                ...captainData,
                email: e.target.value,
              })
            }
            type="email"
            placeholder="captain@example.com"
            className="bg-[#eeeeee] mb-5 rounded px-4 py-3 border w-full"
          />

          <h3 className="text-xl font-medium mb-2">Password</h3>
          <input
            required
            value={captainData.password}
            onChange={(e) =>
              setCaptainData({
                ...captainData,
                password: e.target.value,
              })
            }
            type="password"
            placeholder="Password"
            className="bg-[#eeeeee] mb-5 rounded px-4 py-3 border w-full"
          />

          <hr className="my-6" />

          <h2 className="text-xl font-semibold mb-4">
            Vehicle Information
          </h2>

          <h3 className="text-lg mb-2">Vehicle Color</h3>
          <input
            required
            value={captainData.vehicle.color}
            onChange={(e) =>
              setCaptainData({
                ...captainData,
                vehicle: {
                  ...captainData.vehicle,
                  color: e.target.value,
                },
              })
            }
            type="text"
            placeholder="White"
            className="bg-[#eeeeee] mb-5 rounded px-4 py-3 border w-full"
          />

          <h3 className="text-lg mb-2">Vehicle Plate</h3>
          <input
            required
            value={captainData.vehicle.plate}
            onChange={(e) =>
              setCaptainData({
                ...captainData,
                vehicle: {
                  ...captainData.vehicle,
                  plate: e.target.value,
                },
              })
            }
            type="text"
            placeholder="JH01AB1234"
            className="bg-[#eeeeee] mb-5 rounded px-4 py-3 border w-full"
          />

          <h3 className="text-lg mb-2">Capacity</h3>
          <input
            required
            value={captainData.vehicle.capacity}
            onChange={(e) =>
              setCaptainData({
                ...captainData,
                vehicle: {
                  ...captainData.vehicle,
                  capacity: e.target.value,
                },
              })
            }
            type="number"
            placeholder="4"
            className="bg-[#eeeeee] mb-5 rounded px-4 py-3 border w-full"
          />

          <h3 className="text-lg mb-2">Vehicle Type</h3>

          <select
            required
            value={captainData.vehicle.vehicleType}
            onChange={(e) =>
              setCaptainData({
                ...captainData,
                vehicle: {
                  ...captainData.vehicle,
                  vehicleType: e.target.value,
                },
              })
            }
            className="bg-[#eeeeee] mb-7 rounded px-4 py-3 border w-full"
          >
            <option value="">Select Vehicle</option>
            <option value="car">Car</option>
            <option value="bike">Bike</option>
            <option value="van">Van</option>
          </select>

          <button
            type="submit"
            className="bg-black text-white font-semibold rounded px-4 py-3 w-full mb-4"
          >
            Create Captain Account
          </button>

          <p className="text-center text-sm">
            Already have an account?{" "}
            <Link to="/captain-login" className="text-blue-600">
              Login
            </Link>
          </p>
        </form>
      </div>

      {/* Bottom */}
      <div className="p-7">
        <Link
          to="/signup"
          className="flex items-center justify-center bg-[#10B461] text-white font-semibold rounded px-4 py-3 w-full"
        >
          Sign up as User
        </Link>

        <p className="text-xs text-gray-500 text-center mt-5 leading-5">
          By proceeding, you agree to Uber's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default CaptainSignup;