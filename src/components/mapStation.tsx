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
    { id: 3, nome: "Estação Praça do KM 3", situacao: "Disponível", lat: -22.554298, lng: -42.961517 },
    { id: 4, nome: "Estação Praça do Sapê ", situacao: "Disponível", lat: -22.551828, lng: -42.980415 },
    { id: 5, nome: "Vila Olimpia", situacao: "Em breve", lat: -22.666721, lng: -43.021210 },
    { id: 6, nome: "Cidadania", situacao: "Em breve", lat: -22.650612, lng: -43.020870 },
    { id: 7, nome: "Vale das pedrinhas", situacao: "Em breve", lat: -22.650629, lng: -42.991371 },
    { id: 8, nome: "Praça de Várzea alegre", situacao: "Em breve", lat: -22.670353, lng: -43.027008  },

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
            className={station.id > 4 ? styles.buttonGray : styles.button}
          >
            {station.nome}
          </button>
        ))}
      </div>
    </div>
  );
}

export default MapStation;