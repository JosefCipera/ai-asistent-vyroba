import React, { useState, useEffect } from "react";

// Hlavní komponenta aplikace
function App() {
  // Obecné stavy pro UI (zatím)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Připraveno pro případné chyby z Make

  // Zde budou stavy pro vstup uživatele (příkaz pro AI) a výstup AI
  const [userInput, setUserInput] = useState('');
  const [aiResponse, setAiResponse] = useState('Dobrý den! Jsem váš AI asistent pro plánování výroby. Jak vám mohu pomoci?');

  // Příklad funkce pro odeslání požadavku na Make
  const sendToMake = async () => {
    setLoading(true);
    setError(null);
    setAiResponse('Přemýšlím...'); // Indikace, že AI pracuje

    try {
      // Zde bude URL vašeho Make Webhooku
      const makeWebhookUrl = 'https://hook.eu1.make.com/wonkykm9tztt7qqfbbqp9pnsgxf2zvl5';

      const response = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: userInput }), // Pošlete příkaz uživatele
      });

      if (!response.ok) {
        throw new Error(`HTTP chyba! Status: ${response.status}`);
      }

      const data = await response.json();
      // Předpokládáme, že Make vrátí objekt s "message" nebo "plan"
      setAiResponse(data.message || JSON.stringify(data, null, 2)); // Zobrazí odpověď nebo celý JSON

    } catch (err) {
      setError(`Chyba při komunikaci s Make: ${err.message}`);
      setAiResponse('Omlouvám se, nastala chyba.');
      console.error("Chyba při volání Make:", err);
    } finally {
      setLoading(false);
    }
  };

  // Základní UI pro interakci s AI asistentem
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">AI Asistent Výroba</h1>

        {/* Oblast pro zobrazení odpovědí AI */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4 h-40 overflow-y-auto border border-gray-200">
          <p className="text-gray-700 whitespace-pre-wrap">{aiResponse}</p>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        {/* Vstupní pole pro uživatele */}
        <div className="flex space-x-2">
          <input
            type="text"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Zadejte příkaz pro AI asistenta..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => { // Umožní odeslat příkaz stiskem Enter
              if (e.key === 'Enter') {
                sendToMake();
              }
            }}
            disabled={loading}
          />
          <button
            onClick={sendToMake}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition ease-in-out duration-150"
            disabled={loading}
          >
            {loading ? 'Odesílám...' : 'Odeslat'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;