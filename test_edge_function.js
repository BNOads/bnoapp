
const FUNCTION_URL = "https://tbdooscfrrkwfutkdjha.supabase.co/functions/v1/youtube-dl";
const VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // Me at the zoo

async function testEdgeFunction() {
    console.log(`Testing Edge Function: ${FUNCTION_URL}`);
    try {
        const response = await fetch(FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: VIDEO_URL })
        });

        console.log(`Status: ${response.status}`);
        console.log(`Content-Type: ${response.headers.get("content-type")}`);

        if (!response.ok) {
            const text = await response.text();
            console.log("Error Body:", text);
        } else {
            console.log("Success! Stream received.");
        }
    } catch (error) {
        console.log("Fetch Error:", error.message);
    }
}

testEdgeFunction();
