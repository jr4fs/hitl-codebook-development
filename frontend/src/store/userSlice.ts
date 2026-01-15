import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User } from  "@common/types/accounts";

interface UserState{
    user: User | null
}

const initialState: UserState = {
    user: null
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
})

// Action creators are generated for each case reducer function
export const { setUser, clearUser } = userSlice.actions

export default userSlice.reducer