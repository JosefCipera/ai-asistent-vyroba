import React, { useState, useEffect, useRef } from "react";
// Importujeme auth a db z našeho souboru firebase.js
import { auth, db } from './firebase';
// Importujeme potřebné funkce z Firebase Authentication a Firestore
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  collection,
  query,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy
} from "firebase/firestore";

// Funkce pro převod souboru na base64 (ponechána beze změny)
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Získejte base64 řetězec po "data:image/png;base64,"
    reader.onerror = error => reject(error);
  });
};

// Hlavní komponenta aplikace
function App() {
  // Stavy pro Firebase a autentizaci
  const [userId, setUserId] = useState(null);
  const [loadingFirebase, setLoadingFirebase] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);

  // Stavy pro data a UI
  const [contacts, setContacts] = useState([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactLinkedin, setNewContactLinkedin] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');
  const [newContactImageFile, setNewContactImageFile] = useState(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fileInputRef = useRef(null);

  // Autentizace uživatele anonymně a nastavení userId
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        console.log("Přihlášen jako anonymní uživatel:", user.uid);
      } else {
        signInAnonymously(auth)
          .then((userCredential) => {
            setUserId(userCredential.user.uid);
            console.log("Přihlášen anonymně nově:", userCredential.user.uid);
          })
          .catch((error) => {
            setFirebaseError(error.message);
            console.error("Chyba při anonymním přihlášení:", error);
          });
      }
      setLoadingFirebase(false);
    });

    return () => unsubscribe();
  }, []);

  // Načítání kontaktů z Firestore
  useEffect(() => {
    if (!userId) return;

    setLoadingFirebase(true);
    const q = query(collection(db, `users/${userId}/contacts`));
    // const q = query(collection(db, "testcollection"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedContacts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setContacts(updatedContacts);
      console.log("Načtené kontakty (celé pole):", updatedContacts); // <--- ZDE JE NOVÝ LOG
      setLoadingFirebase(false);
    }, (error) => {
      setFirebaseError(error.message);
      console.error("Chyba při načítání kontaktů:", error);
      setLoadingFirebase(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Funkce pro přidání kontaktu
  const handleAddContact = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFirebaseError(null);

    if (!newContactName || !newContactEmail) {
      setFirebaseError("Jméno a email jsou povinné.");
      setLoading(false);
      return;
    }

    try {
      let base64ImageString = '';
      if (newContactImageFile) {
        base64ImageString = await fileToBase64(newContactImageFile);
      }

      await addDoc(collection(db, `users/${userId}/contacts`), {
        name: newContactName,
        email: newContactEmail,
        linkedin: newContactLinkedin,
        notes: newContactNotes,
        image: base64ImageString, // Ukládáme Base64 řetězec
        createdAt: Timestamp.now(),
      });

      // Reset formuláře
      setNewContactName('');
      setNewContactEmail('');
      setNewContactLinkedin('');
      setNewContactNotes('');
      setNewContactImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsAddingContact(false); // Zavře formulář pro přidání
    } catch (error) {
      setFirebaseError(error.message);
      console.error("Chyba při přidávání kontaktu:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funkce pro zahájení úprav kontaktu
  const startEditContact = (contact) => {
    setEditingContact(contact);
    setNewContactName(contact.name);
    setNewContactEmail(contact.email);
    setNewContactLinkedin(contact.linkedin || '');
    setNewContactNotes(contact.notes || '');
    setNewContactImageFile(null); // Reset pro obrázek při úpravě
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Funkce pro aktualizaci kontaktu
  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFirebaseError(null);

    if (!newContactName || !newContactEmail) {
      setFirebaseError("Jméno a email jsou povinné.");
      setLoading(false);
      return;
    }

    try {
      const contactRef = doc(db, `users/${userId}/contacts`, editingContact.id);
      let updatedImageData = editingContact.image; // Zachování stávajícího obrázku

      if (newContactImageFile) {
        // Pouze pokud byl vybrán nový obrázek
        updatedImageData = await fileToBase64(newContactImageFile);
      }

      await updateDoc(contactRef, {
        name: newContactName,
        email: newContactEmail,
        linkedin: newContactLinkedin,
        notes: newContactNotes,
        image: updatedImageData, // Ukládáme Base64 řetězec
        updatedAt: Timestamp.now(),
      });

      // Reset formuláře a stavů
      setEditingContact(null);
      setNewContactName('');
      setNewContactEmail('');
      setNewContactLinkedin('');
      setNewContactNotes('');
      setNewContactImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setFirebaseError(error.message);
      console.error("Chyba při aktualizaci kontaktu:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funkce pro zrušení úprav
  const cancelEditContact = () => {
    setEditingContact(null);
    setNewContactName('');
    setNewContactEmail('');
    setNewContactLinkedin('');
    setNewContactNotes('');
    setNewContactImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Funkce pro zahájení mazání kontaktu
  const startDeleteContact = (contact) => {
    setSelectedContact(contact);
    setShowDeleteConfirm(true);
  };

  // Funkce pro potvrzení mazání kontaktu
  const handleDeleteContactConfirmed = async () => {
    if (!selectedContact) return;

    setLoading(true);
    setFirebaseError(null);
    try {
      await deleteDoc(doc(db, `users/${userId}/contacts`, selectedContact.id));
      setSelectedContact(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      setFirebaseError(error.message);
      console.error("Chyba při mazání kontaktu:", error);
    } finally {
      setLoading(false);
    }
  };

  // Funkce pro zrušení mazání
  const cancelDeleteContact = () => {
    setSelectedContact(null);
    setShowDeleteConfirm(false);
  };

  if (loadingFirebase) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-700 text-lg">Načítám Firebase...</p>
      </div>
    );
  }

  if (firebaseError) {
    console.error("Chyba Firebase:", firebaseError); // Přidáme log pro debug
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100">
        <p className="text-red-700 text-lg">
          Nastala chyba při načítání dat: {firebaseError.message || "Neznámá chyba."}
        </p>
      </div>
    );
  }
}
export default App; // <--- TOTO MUSÍ BÝT HNED POD UZAVÍRACÍ ZÁVORKOU FUNKCE
