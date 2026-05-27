import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, firebaseReady } from "../firebase";
import { setAuthToken } from "../api/client";

export function useFirebaseAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        setToken(idToken);
        setAuthToken(idToken);
      } else {
        setToken("");
        setAuthToken("");
      }
      setLoading(false);
    });
  }, []);

  return { user, token, loading };
}
