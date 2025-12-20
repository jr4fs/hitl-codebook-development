import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { RouterProvider } from "react-router";
import "./App.css"
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <MantineProvider>
      <RouterProvider router= {}/>
      </MantineProvider>
  );
}
