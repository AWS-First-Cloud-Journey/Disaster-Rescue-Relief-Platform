import logo from './logo.png';
import './App.css';
import { Outlet } from 'react-router-dom';
import {
  SpaceBetween,
} from "@cloudscape-design/components";
import NavBar from './components/NavBar';

function App() {

  return (
    <SpaceBetween size="l">
      <NavBar />
      <Outlet />
    </SpaceBetween>
  );
}

export default App;
