import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import { MantineProvider } from '@mantine/core';
import { RouterProvider } from "react-router";
import { router } from './router';
//import { useState } from 'react';

export default function App() {

  return (
    <MantineProvider>
      <RouterProvider router= {router}/>
      </MantineProvider>
  );
}
