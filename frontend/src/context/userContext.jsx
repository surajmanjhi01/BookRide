import react,{createContext,useState} from 'react'

export const UserDataContext=createContext()
const UserDataContextProvider=({children})=>{
    const [user,setUser]=useState({
        email:'',
        name:'',
    })
    return(
       <UserDataContext.Provider value={{user,setUser}}>
        {children}
       </UserDataContext.Provider>
    )
}
export default UserDataContextProvider;