import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User } from "@common/types/accounts";
import { JWTPayload } from "@common/types/auth";
import { jwtDecode } from "jwt-decode";

interface UserState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface SetUserPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

const getInitialUser = (): User | null => {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    const decoded = jwtDecode<JWTPayload>(token);
    // Check if token is expired
    const currentTime = Date.now() / 1000;
    if ((decoded as any).exp && (decoded as any).exp < currentTime) {
      localStorage.removeItem('accessToken');
      return null;
    }

    return {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      name: decoded.username //TODO: Implement taking in a name for the user on account creation OR remove name attribute
    };
  } catch (error) {
    localStorage.removeItem('accessToken');
    return null;
  }
};

const initialState: UserState = {
  user: getInitialUser(),
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken')
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<SetUserPayload>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    clearUser: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
  },
})

// Action creators are generated for each case reducer function
export const { setUser, clearUser } = userSlice.actions

export default userSlice.reducer