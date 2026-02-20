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
}
// const getInitialUser = (): User | null => {
//   const token = localStorage.getItem('accessToken');
//   if (!token) return null;

//   try {
//     const decoded = jwtDecode<JWTPayload>(token);
//     // Check if token is expired
//     const currentTime = Date.now() / 1000;
//     if ((decoded as any).exp && (decoded as any).exp < currentTime) {
//       localStorage.removeItem('accessToken');
//       return null;
//     }

//     return {
//       id: decoded.userId,
//       username: decoded.username,
//       email: decoded.email,
//       name: decoded.username //TODO: Implement taking in a name for the user on account creation OR remove name attribute
//     };
//   } catch (error) {
//     localStorage.removeItem('accessToken');
//     return null;
//   }
// };

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