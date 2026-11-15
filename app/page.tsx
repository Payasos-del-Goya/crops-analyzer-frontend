import Map from "@/components/map";
import Monitor from "@/components/monitor";

export default async function Home() {
  const data = await fetch('http://127.0.0.1:8000/balizas')
  const balizas = await data.json();
  const markers = balizas.crops?.map((crop: any) => ({
      lat: crop.latitud,
      lng: crop.longitud,
      label: crop.id,
    })) || [];
  return (
    <section className="flex items-stretch justify-center gap-4 w-full h-[calc(100vh-5rem)] p-4">
      <Map
        center={[41.683298, -0.88442]}
        zoom={16}
        markers={markers}
      />
      <Monitor />
    </section>
  );
}
