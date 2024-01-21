import React from 'react'
import './Find.css'
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api'
// import { IconContext } from "react-icons";
// import { GiBeachBall } from "react-icons/gi";
import beachBall from '../../assets/pngwing.com.png'

// const styles = require('./darkMap.json')

const Find = () => {
  const [number, setNumber] = React.useState(1)
  const arr = [
    {lat: 17.4065, lng: 78.4772},
    {lat: 17.4039, lng: 78.5946},
    {lat: 17.4168, lng: 76.4558},
    {lat: 17.5027, lng: 78.5827},
    {lat: 17.5457, lng: 78.5927},
  ]
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "AIzaSyCAvJOrFqiXDcwli8QxHrfiLxuvIOul1ic"
  })
  const changeNumber = () => {
    setNumber(number + 1)
  }
  if (!isLoaded) return <p>Loading...</p>
  else return (
    <GoogleMap
      zoom={12}
      center={{lat: 17.4065, lng: 78.4772}}
      mapContainerClassName="map-container"
    >
      <button onClick={changeNumber} className="button-map">
        Fetch
      </button>
        {arr.slice(0, number).map((item, index) => (
          <Marker
            key={index}
            icon={{
              url: beachBall,
              anchor: new google.maps.Point(17, 46),
              scaledSize: new google.maps.Size(37, 37)
            }}
            position={item}
          />
        ))}
    </GoogleMap>
  )
}

export default Find