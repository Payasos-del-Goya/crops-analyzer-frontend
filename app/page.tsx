import Map from "@/components/map";
import Monitor from "@/components/monitor";

export default function Home() {
  return (
    <section className="flex flex items-center justify-center gap-4 w-full h-full p-1">
      <Map
        center={[41.683298, -0.88442]}
        zoom={16}
        markers={[
          { lat: 41.6850, lng: -0.8870, label: "A" },
          { lat: 41.6855, lng: -0.8820, label: "B" },
          { lat: 41.6830, lng: -0.8800, label: "C" },
          { lat: 41.6810, lng: -0.8830, label: "D" },
          { lat: 41.6815, lng: -0.8880, label: "E" },
        ]}
      />
      <Monitor />
    </section>
  );
}
