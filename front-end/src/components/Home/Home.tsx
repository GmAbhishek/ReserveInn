import beachVolleyball from '../../assets/hotel.gif'
import beachify from '../../assets/search.gif'
import boat1 from '../../assets/Trolley.gif'
import dogWalking from '../../assets/homealone.gif'
import translavaniya from '../../assets/Translavaniya.gif'
import { IconContext } from "react-icons";
import { GiBeachBucket } from "react-icons/gi"
import { FaUmbrellaBeach } from "react-icons/fa"
import { TbBeach } from "react-icons/tb"
import { GiOffshorePlatform } from "react-icons/gi"
import './Home.css'

const Home = () => {
  return (
    <div className="home-container">
      
      <div className="top-container">
        <div className="side-container">
          <p className="header-text">Swift and slick, your room's the pick</p>
          <button className="get-started-button">
            Get started
            <IconContext.Provider value={{ size: "17px", color: "black", className: "get-started-icon"}}>
              <GiBeachBucket />
            </IconContext.Provider>
          </button>
        </div>
        <div className="header-image-container">
          <img className="header-image" src={beachVolleyball} alt="Beach Volleyball"/>
        </div>
      </div>

      <div className="mid-container">

       

        <div className="single-mid-container">

          <div className="header-image-container-2">
            <img className="header-image" src={dogWalking} alt="Dog Walking"/>
          </div>
          <div className="side-container-1">
            <p className="header-text">Lay Back and relax</p>
            <button className="get-started-button-mod">
              Let's relax
              <IconContext.Provider value={{ size: "17px", color: "black", className: "get-started-icon"}}>
                <FaUmbrellaBeach />
              </IconContext.Provider>
            </button>
          </div>
        </div>

        <div className="single-mid-container">
          <div className="side-container-1">
            <p className="header-text">One Stop destination</p>
            <button className="get-started-button-mod">
              Book here
              <IconContext.Provider value={{ size: "17px", color: "black", className: "get-started-icon"}}>
                <TbBeach />
              </IconContext.Provider>
            </button>
          </div>
          <div className="header-image-container-3">
            <img className="header-image" src={beachify} alt="Surfing"/>
          </div>
        </div>

        <div className="single-mid-container">
          <div className="header-image-container-4">
            <img className="header-image" src={boat1} alt="Casual Beach"/>
          </div>
          <div className="side-container-1">
            <p className="header-text">HassleFree Experience</p>
            <button className="get-started-button-mod">
              Let's go
              <IconContext.Provider value={{ size: "17px", color: "black", className: "get-started-icon"}}>
                <GiOffshorePlatform />
              </IconContext.Provider>
            </button>
          </div>
        </div>
        <div className="single-mid-container">
          <div className="side-container-1">
            <p className="header-text">Get Rid of Crampy Stays</p>
            <button className="get-started-button-mod">
              Book wise
              <IconContext.Provider value={{ size: "17px", color: "black", className: "get-started-icon"}}>
                <TbBeach />
              </IconContext.Provider>
            </button>
          </div>
          <div className="header-image-container-5">
            <img className="header-image" src={translavaniya} alt="Surfing"/>
          </div>
        </div>
      </div>
      <footer>
      <div>
        <p>&copy; 2024 ReserveInn. All rights reserved.</p>
      </div>
    </footer>
    </div>
  )
}

export default Home