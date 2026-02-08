import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User } from "@common/types/accounts";
import { buildUserFromToken, isTokenExpired } from "../lib/auth";

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

const storedAccessToken = localStorage.getItem('accessToken');
const storedRefreshToken = localStorage.getItem('refreshToken');
const storedUser = localStorage.getItem('user');

const validAccessToken =
  storedAccessToken && !isTokenExpired(storedAccessToken)
    ? storedAccessToken
    : null;

if (!validAccessToken) {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

let hydratedUser: User | null = null;
if (validAccessToken) {
  if (storedUser) {
    try {
      hydratedUser = JSON.parse(storedUser) as User;
    } catch {
      hydratedUser = null;
    }
  }
  if (!hydratedUser) {
    hydratedUser = buildUserFromToken(validAccessToken);
  }
}

const initialState: UserState = {
  user: hydratedUser,
  accessToken: validAccessToken,
  refreshToken: validAccessToken ? storedRefreshToken : null
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
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    clearUser: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
  },
})

// Action creators are generated for each case reducer function
export const { setUser, clearUser } = userSlice.actions

export default userSlice.reducer