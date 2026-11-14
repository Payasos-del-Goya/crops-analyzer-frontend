import Map from "@/components/map";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 h-full w-full">
      <Map
        center={[41.683298, -0.88442]}
        zoom={100}
        markers={[
          {
            lat: 41.15,
            lng: -96.0,
            popupHtml: `<div><strong>🌽 Corn Belt – Nebraska</strong><br/>High yield zone · NDVI 0.82</div>`,
          },
          {
            lat: 36.77,
            lng: -119.78,
            popupHtml: `<div><strong>🍇 Central Valley – CA</strong><br/>Irrigation monitored · Soil moisture 34%</div>`,
          },
        ]}
      />
    </section>
  );
}
