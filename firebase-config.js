import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push, get, child, remove } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCMhfZLVHzRMn-poqb-vdvpSpXlOcwjo90",
    authDomain: "samvad-bafaa.firebaseapp.com",
    databaseURL: "https://samvad-bafaa-default-rtdb.firebaseio.com",
    projectId: "samvad-bafaa",
    storageBucket: "samvad-bafaa.appspot.com",
    messagingSenderId: "131803431466",
    appId: "1:131803431466:web:b7b107308ea7197f013953",
    measurementId: "G-M90SYY2MP9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, set, onValue, update, push, get, child, remove };
