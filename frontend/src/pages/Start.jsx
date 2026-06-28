import React from 'react'
import { Link } from 'react-router-dom'

const Start=()=>{
    return(
       <div className="bg-cover bg-bottom bg-[url('https://images.unsplash.com/photo-1593950315186-76a92975b60c?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] h-screen pt-8  flex justify-between flex-col w-full bg-red-400">
        <img className="w-25 ml-8 " src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png" alt="Uber Logo"></img>
        <div className='bg-white pb-7 py-3 px-4'>   
            <h2 className='text-2xl ml-15 font-bold'>Get Started with Uber</h2>
            <Link className='flex items-center justify-center w-full bg-black text-white py-2 px-4 rounded-md mt-2' to="/login">
            Continue</Link>
        </div>
    </div>
    )
}
export default Start