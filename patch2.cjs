const fs = require('fs');
const content = fs.readFileSync('/app/applet/src/pages/PublicApp.tsx', 'utf8');

const searchA = `  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info("Fetching your location...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCheckoutLat(lat);
          setCheckoutLng(lng);
          toast.success("Location updated. You can drag the pin to adjust.");
          
          try {
            if ((window as any).google) {
              const geocoder = new (window as any).google.maps.Geocoder();
              const response = await geocoder.geocode({ location: { lat, lng } });
              if (response.results && response.results[0]) {
                const addr = response.results[0].formatted_address;
                setDeliveryAddress(addr);
              }
            }
          } catch (err) {
            console.warn("Reverse geocode failed", err);
          }
        },
        (err) => {
          console.error(err);
          toast.error("Failed to get location. Please check browser permissions.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };`;

const replaceA = `  const [district, setDistrict] = useState('');

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.info("Fetching your location...");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCheckoutLat(lat);
          setCheckoutLng(lng);
          toast.success("Location updated. You can drag the pin to adjust.");
          
          try {
            if ((window as any).google) {
              const geocoder = new (window as any).google.maps.Geocoder();
              const response = await geocoder.geocode({ location: { lat, lng } });
              if (response.results && response.results[0]) {
                const addr = response.results[0].formatted_address;
                setDeliveryAddress(addr);
                const components = response.results[0].address_components || [];
                const districtComponent = components.find((c: any) => c.types.includes('administrative_area_level_2'))
                  || components.find((c: any) => c.types.includes('administrative_area_level_3'))
                  || components.find((c: any) => c.types.includes('locality'));
                if (districtComponent) setDistrict(districtComponent.long_name);
              }
            }
          } catch (err) {
            console.warn("Reverse geocode failed", err);
          }
        },
        (err) => {
          console.error(err);
          toast.error("Failed to get location. Please check browser permissions.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
    }
  };`;

if (content.includes(searchA)) {
    fs.writeFileSync('/app/applet/src/pages/PublicApp.tsx', content.replace(searchA, replaceA));
    console.log("PATCH APPLIED");
} else {
    console.log("PATCH FAILED");
}
