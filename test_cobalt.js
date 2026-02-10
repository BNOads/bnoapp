
const COBALT_API_URL = "https://api.cobalt.tools/api/json";
const VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

async function testCobalt() {
    console.log(`Testing Cobalt API: ${COBALT_API_URL}`);
    try {
        const response = await fetch(COBALT_API_URL, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: VIDEO_URL,
                vCodec: "h264",
                vQuality: "720",
                aFormat: "mp3",
                filenamePattern: "basic"
            })
        });

        console.log(`Status: ${response.status}`);
        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.log("Error:", error.message);
    }
}

testCobalt();
