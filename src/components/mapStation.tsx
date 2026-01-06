import {useState, useEffect} from "react"
import { MapContainer, TileLayer, Marker, useMap} from "react-leaflet"
import 'leaflet/dist/leaflet.css';
import L from "leaflet"
import icon from "leaflet/dist/images/marker-icon.png"
import iconShadow from "leaflet/dist/images/marker-shadow.png"
import styles from "./mapStation.module.scss"


interface Station {
    id: number;
    nome: string;
    lat: number;
    lng: number;
}

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon as any;

const stations = [
    { id: 1, nome: "Estação Orindi", situacao: "Disponível", lat: -22.543380, lng: -42.894094 },
    { id: 2, nome: "Estação Paraíso", situacao: "Disponível", lat: -22.500312, lng: -42.903147 },
    { id: 3, nome: "Estação KM 2.5", situacao: "Indisponível", lat: -22.523, lng: -42.9803 },
    { id: 4, nome: "Estação Parada Modelo", situacao: "Indisponível", lat: -22.5459, lng: -42.985 },

];

type MapControlProps = {
    coords:Station
}


const MapControl = ({coords}: MapControlProps) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo([coords.lat, coords.lng], 15, { duration: 2 });
    } , [coords, map]);
    return null;
}

const MapStation = () => { 
    const [activeStation, setActiveStation] = useState(stations[0]);
    
    return (
    <div className={styles.container}>
      <p>Situação da Estação Selecionada: <span><strong>{activeStation.situacao}</strong></span></p>


      <MapContainer 
        center={[activeStation.lat, activeStation.lng]} 
        zoom={13} 
        className={styles.mapContainer}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[activeStation.lat, activeStation.lng]}>
        </Marker>

        <MapControl coords={activeStation} />
      </MapContainer>

      <div className={styles.buttonContainer}>
        {stations.map((station) => (
          <button
            key={station.id}
            onClick={() => setActiveStation(station)}
            className={station.id > 2 ? styles.buttonGray : styles.button}
          >
            {station.nome}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MapStation;