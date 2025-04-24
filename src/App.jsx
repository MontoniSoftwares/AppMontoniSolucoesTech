import { logEvent } from "firebase/analytics";
import { get, ref, set } from "firebase/database";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import AdminPage from "./AdminPage";
import { analytics, database } from "./firebase";

function App() {
  const [registerModal, setRegisterModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [observation, setObservation] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showRegisterButton, setShowRegisterButton] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState(null);

  const validateWhatsapp = (number) => {
    const whatsappRegex = /^\d{10,11}$/;
    return whatsappRegex.test(number);
  };

  const validateCep = (cep) => {
    const cepRegex = /^\d{8}$/;
    return cepRegex.test(cep);
  };

  const getGreetingByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const fetchAddressByCep = useCallback(async (cep) => {
    if (!validateCep(cep)) return;
    setIsFetchingAddress(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        alert("CEP não encontrado.");
        setStreet("");
        setNeighborhood("");
        setCity("");
      } else {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
      }
    } catch {
      alert("Erro ao buscar endereço.");
      setStreet("");
      setNeighborhood("");
      setCity("");
    } finally {
      setIsFetchingAddress(false);
    }
  }, []);

  useEffect(() => {
    if (cep.length === 8) {
      fetchAddressByCep(cep);
    } else {
      setStreet("");
      setNeighborhood("");
      setCity("");
    }
  }, [cep, fetchAddressByCep]);

  const timeSlots = useMemo(() => ["09:00", "11:00", "13:00", "15:00"], []);

  const checkAvailableTimes = useCallback(
    async (selectedDate) => {
      if (!selectedDate || !loggedInUser) {
        setAvailableTimes([]);
        return;
      }

      const scheduleRef = ref(
        database,
        `clients/${loggedInUser.whatsapp}/schedules/${selectedDate}`
      );
      const snapshot = await get(scheduleRef);
      const unavailableTimes = [];

      if (snapshot.exists()) {
        const schedulesForDate = snapshot.val();
        for (const time of timeSlots) {
          if (schedulesForDate[time]) {
            unavailableTimes.push(time);
          }
        }
      }

      const available = timeSlots.filter(
        (time) => !unavailableTimes.includes(time)
      );
      setAvailableTimes(available);

      if (meetingTime && !available.includes(meetingTime)) {
        setMeetingTime("");
      }
    },
    [timeSlots, meetingTime, loggedInUser]
  );

  useEffect(() => {
    checkAvailableTimes(meetingDate);
  }, [meetingDate, checkAvailableTimes]);

  useEffect(() => {
    logEvent(analytics, "page_view", {
      page_title: "Montoni Soluções Tech - Home",
    });
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, null, window.location.pathname);
    }
  }, []);

  const handleLogin = async () => {
    if (!whatsapp) {
      alert("Por favor, insira o número de WhatsApp.");
      setWhatsapp("");
      setLoginModal(false);
      return;
    }

    if (!validateWhatsapp(whatsapp)) {
      alert(
        "WhatsApp inválido! Use apenas números no total de 11 dígitos (ex: xxxxxxxxxxx)."
      );
      setWhatsapp("");
      setLoginModal(false);
      return;
    }

    try {
      const userRef = ref(database, `clients/${whatsapp}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        alert("Número de WhatsApp não cadastrado. Vamos te cadastrar agora!");
        setShowRegisterButton(true);
        setRegisterModal(true);
        setLoginModal(false);
      } else {
        const userData = snapshot.val();
        setLoggedInUser(userData);
        setLoginModal(false);
        logEvent(analytics, "client_login", { whatsapp });

        const greeting = getGreetingByTime();
        const message = `${greeting}, ${userData.name}!`;
        setGreetingMessage(message);

        setTimeout(() => {
          setGreetingMessage(null);
        }, 5000);
      }
    } catch (error) {
      alert(`Erro no login: ${error.message}`);
      setWhatsapp("");
      setLoginModal(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !whatsapp) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    if (!validateWhatsapp(whatsapp)) {
      alert(
        "WhatsApp inválido! Use apenas números no total de 11 dígitos (ex: xxxxxxxxxxx)."
      );
      setWhatsapp("");
      return;
    }

    try {
      const userData = { name, email, whatsapp };
      await set(ref(database, `clients/${whatsapp}`), userData);

      setRegisterModal(false);
      setLoggedInUser(userData);
      setName("");
      setEmail("");
      setWhatsapp("");
      setShowRegisterButton(false);
      logEvent(analytics, "client_registered", { whatsapp });

      const greeting = getGreetingByTime();
      const message = `${greeting}, ${userData.name}!`;
      setGreetingMessage(message);

      setTimeout(() => {
        setGreetingMessage(null);
      }, 5000);
    } catch (error) {
      alert(`Erro no cadastro: ${error.message}`);
      setWhatsapp("");
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setShowRegisterButton(false);
    setWhatsapp("");
    logEvent(analytics, "client_logout", { whatsapp });
    setIsMenuOpen(false);
  };

  const handleSchedule = () => {
    if (!loggedInUser) {
      alert("Usuário não autenticado! Faça login primeiro.");
      return;
    }

    if (!meetingDate || !meetingTime) {
      alert("Por favor, selecione data e hora.");
      return;
    }

    if (!cep || !street || !number || !neighborhood || !city) {
      alert("Por favor, preencha todos os campos de endereço.");
      return;
    }

    if (!validateCep(cep)) {
      alert("CEP inválido. Deve conter exatamente 8 dígitos (ex.: 28890000).");
      return;
    }

    const scheduleRef = ref(
      database,
      `clients/${loggedInUser.whatsapp}/schedules/${meetingDate}/${meetingTime}`
    );

    get(scheduleRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          alert(
            "Você já tem um agendamento neste horário. Por favor, escolha outro."
          );
          checkAvailableTimes(meetingDate);
        } else {
          const isOnline = city.trim().toLowerCase() !== "rio das ostras";

          const address = { cep, street, number, neighborhood, city };
          set(scheduleRef, {
            observation: observation || "",
            address,
            isOnline,
            meetLink: null, // Link será definido pelo admin posteriormente
          })
            .then(() => {
              const formattedDate = new Date(meetingDate).toLocaleDateString(
                "pt-BR"
              );
              const addressText = `${street}, ${number}, ${neighborhood}, ${city} - CEP: ${cep}`;
              const meetingDetails = `Data: ${formattedDate}, Horário: ${meetingTime}`;

              // Mensagem para o cliente
              let clientMessage = `Confirmação de agendamento - Montoni Soluções Tech\n\nNossa Equipe da Montoni Soluções Tech recebeu seu agendamento!\n\n`;
              if (isOnline) {
                clientMessage += `Reunião ONLINE\n${meetingDetails}\nLink do Google Meet: Em breve você receberá o link da reunião.\nObservações: ${
                  observation || "Nenhuma"
                }`;
              } else {
                clientMessage += `Reunião PRESENCIAL\n${meetingDetails}\nEndereço: ${addressText}\nObservações: ${
                  observation || "Nenhuma"
                }`;
              }

              const clientMessageUrl = `https://wa.me/+55${
                loggedInUser.whatsapp
              }?text=${encodeURIComponent(clientMessage)}`;
              window.open(clientMessageUrl, "_blank");

              // Mensagem para a empresa
              const clientName = loggedInUser.name || "Cliente Desconhecido";
              const companyMessage = `Novo agendamento - Montoni Soluções Tech\n\nCliente: ${clientName} (WhatsApp: ${
                loggedInUser.whatsapp
              })\n${meetingDetails}\n${
                isOnline
                  ? `Reunião ONLINE\nLink do Google Meet: Será definido em breve.`
                  : `Reunião PRESENCIAL\nEndereço: ${addressText}`
              }\nObservações: ${observation || "Nenhuma"}`;
              const companyMessageUrl = `https://wa.me/+5522999998352?text=${encodeURIComponent(
                companyMessage
              )}`;
              window.open(companyMessageUrl, "_blank");

              // Alerta para o usuário
              alert(
                `Reunião agendada para ${formattedDate} às ${meetingTime}! Uma mensagem de confirmação foi enviada para o seu WhatsApp.`
              );

              setScheduleModal(false);
              setMeetingDate("");
              setMeetingTime("");
              setObservation("");
              setCep("");
              setStreet("");
              setNumber("");
              setNeighborhood("");
              setCity("");
              logEvent(analytics, "meeting_scheduled", {
                date: meetingDate,
                time: meetingTime,
                whatsapp: loggedInUser.whatsapp,
                observation: observation || "Nenhuma observação",
                isOnline,
              });
            })
            .catch((error) => alert("Erro ao agendar: " + error.message));
        }
      })
      .catch((error) =>
        alert("Erro ao verificar disponibilidade: " + error.message)
      );
  };

  const scrollToSection = (sectionId) => {
    setIsMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="bg-gray-900 text-white font-sans min-h-screen w-full">
              <style>
                {`
                  @keyframes fadeIn {
                    from {
                      opacity: 0;
                      transform: translateY(-10px);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0);
                    }
                  }

                  .animate-fade-in {
                    animation: fadeIn 0.5s ease-in-out;
                  }
                `}
              </style>
              <nav className="bg-gray-800 py-4 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <img
                        src="/src/assets/Logo_MS.png"
                        alt="Montoni Logo"
                        className="h-10 mr-4"
                      />
                      <h1 className="text-xl sm:text-2xl font-bold">
                        Montoni Soluções Tech
                      </h1>
                    </div>
                    <div className="hidden md:flex items-center space-x-4">
                      {loggedInUser ? (
                        <>
                          <button
                            onClick={() => scrollToSection("services")}
                            className="text-pink-400 hover:text-pink-600"
                          >
                            Serviços
                          </button>
                          <button
                            onClick={() => scrollToSection("contact")}
                            className="text-pink-400 hover:text-pink-600"
                          >
                            Contato
                          </button>
                          <button
                            onClick={() => {
                              setScheduleModal(true);
                              logEvent(analytics, "open_schedule_modal");
                            }}
                            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
                          >
                            Agendar Reunião
                          </button>
                          <button
                            onClick={handleLogout}
                            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
                          >
                            Sair
                          </button>
                        </>
                      ) : showRegisterButton ? (
                        <button
                          onClick={() => {
                            setRegisterModal(true);
                            logEvent(analytics, "open_register_modal");
                          }}
                          className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
                        >
                          Cadastrar
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => scrollToSection("services")}
                            className="text-pink-400 hover:text-pink-600"
                          >
                            Serviços
                          </button>
                          <button
                            onClick={() => scrollToSection("contact")}
                            className="text-pink-400 hover:text-pink-600"
                          >
                            Contato
                          </button>
                          <button
                            onClick={() => {
                              setLoginModal(true);
                              logEvent(analytics, "open_login_modal");
                            }}
                            className="text-pink-400 hover:text-pink-600"
                          >
                            Login
                          </button>
                        </>
                      )}
                      <Link
                        to="/admin"
                        className="text-pink-400 hover:text-pink-600 flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="mr-2"
                        >
                          <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v3H9V7c0-1.654 1.346-3 3-3zm-6 8h12v8H6v-8zm6 2c-1.104 0-2 .896-2 2s.896 2 2 2 2-.896 2-2-.896-2-2-2z" />
                        </svg>
                        Admin
                      </Link>
                    </div>
                    <div className="md:hidden flex items-center">
                      <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-pink-400 hover:text-pink-600 focus:outline-none"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d={
                              isMenuOpen
                                ? "M6 18L18 6M6 6l12 12"
                                : "M4 6h16M4 12h16M4 18h16"
                            }
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {isMenuOpen && (
                    <div className="md:hidden mt-4 flex flex-col space-y-2">
                      {loggedInUser ? (
                        <>
                          <button
                            onClick={() => scrollToSection("services")}
                            className="text-pink-400 hover:text-pink-600 text-left"
                          >
                            Serviços
                          </button>
                          <button
                            onClick={() => scrollToSection("contact")}
                            className="text-pink-400 hover:text-pink-600 text-left"
                          >
                            Contato
                          </button>
                          <button
                            onClick={() => {
                              setScheduleModal(true);
                              logEvent(analytics, "open_schedule_modal");
                            }}
                            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 text-left"
                          >
                            Agendar Reunião
                          </button>
                          <button
                            onClick={handleLogout}
                            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 text-left"
                          >
                            Sair
                          </button>
                        </>
                      ) : showRegisterButton ? (
                        <button
                          onClick={() => {
                            setRegisterModal(true);
                            logEvent(analytics, "open_register_modal");
                          }}
                          className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 text-left"
                        >
                          Cadastrar
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => scrollToSection("services")}
                            className="text-pink-400 hover:text-pink-600 text-left"
                          >
                            Serviços
                          </button>
                          <button
                            onClick={() => scrollToSection("contact")}
                            className="text-pink-400 hover:text-pink-600 text-left"
                          >
                            Contato
                          </button>
                          <button
                            onClick={() => {
                              setLoginModal(true);
                              logEvent(analytics, "open_login_modal");
                            }}
                            className="text-pink-400 hover:text-pink-600 text-left"
                          >
                            Login
                          </button>
                        </>
                      )}
                      <Link
                        to="/admin"
                        className="text-pink-400 hover:text-pink-600 flex items-center"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="mr-2"
                        >
                          <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v3H9V7c0-1.654 1.346-3 3-3zm-6 8h12v8H6v-8zm6 2c-1.104 0-2 .896-2 2s.896 2 2 2 2-.896 2-2-.896-2-2-2z" />
                        </svg>
                        Admin
                      </Link>
                    </div>
                  )}
                </div>
              </nav>

              {greetingMessage && (
                <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
                  {greetingMessage}
                </div>
              )}

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <section className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-purple-600 to-pink-600 text-center">
                  <div className="px-4">
                    <h2 className="text-3xl sm:text-5xl font-bold mb-4">
                      Bem-vindo à Montoni Soluções Tech
                    </h2>
                    <p className="text-lg sm:text-xl mb-4">
                      Transformamos ideias em soluções tecnológicas inovadoras.
                    </p>
                    <button
                      onClick={() => scrollToSection("services")}
                      className="bg-pink-500 text-white px-6 py-3 rounded hover:bg-pink-600"
                    >
                      Conheça nossos serviços
                    </button>
                  </div>
                </section>

                <section id="services" className="py-16">
                  <h2 className="text-4xl font-bold text-center mb-12">
                    Nossos Serviços
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center text-center">
                      <h3 className="text-2xl font-semibold mb-4">
                        Desenvolvimento Web
                      </h3>
                      <p>
                        Páginas, landing pages e experiências digitais
                        incríveis.
                      </p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center text-center">
                      <h3 className="text-2xl font-semibold mb-4">
                        Desenvolvimento de Apps
                      </h3>
                      <p>Apps nativos, PWAs e webapps sob medida.</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center text-center">
                      <h3 className="text-2xl font-semibold mb-4">
                        Sistemas SaaS
                      </h3>
                      <p>Soluções ERP, CRM e SCM personalizadas.</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center text-center">
                      <h3 className="text-2xl font-semibold mb-4">
                        Consultoria em TI
                      </h3>
                      <p>
                        Orientação especializada para sua transformação digital.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="contact" className="py-16 bg-gray-800 text-center">
                  <div>
                    <h2 className="text-4xl font-bold mb-6">
                      Entre em Contato
                    </h2>
                    <p className="text-xl mb-4">
                      Telefone e Whatsapp:{" "}
                      <a
                        href="https://wa.me/5522999998352"
                        className="text-pink-400 hover:text-pink-600 flex justify-center items-center"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="mr-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="text-pink-400"
                          >
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.563 4.245 1.626 6.082L0 24l5.916-1.626A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22.001c-1.963 0-3.838-.567-5.44-1.63l-.389-.206-3.514.966.966-3.514-.206-.389A9.934 9.934 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.618-4.737c-.31-.155-1.838-.906-2.122-1.01-.283-.104-.49-.155-.696.155-.206.31-.798.906-.982 1.113-.184.206-.367.226-.677.072-.31-.155-1.31-.482-2.498-1.536-.923-.823-1.546-1.837-1.73-2.147-.184-.31-.019-.477.138-.632.14-.138.31-.361.465-.542.155-.181.206-.31.31-.515.103-.206.052-.387-.026-.542-.077-.155-.696-1.678-.955-2.3-.252-.6-.507-.518-.696-.518h-.595c-.206 0-.54.077-.825.387-.283.31-1.082 1.062-1.082 2.59s1.108 3.002 1.262 3.208c.155.206 2.19 3.335 5.31 4.677.74.33 1.313.527 1.765.674.74.24 1.414.206 1.946.126.595-.09 1.838-.752 2.098-1.477.258-.725.258-1.34.180-1.477-.077-.138-.283-.206-.595-.361z" />
                          </svg>
                        </span>
                        (22) 9 9999-8352
                      </a>
                      <a
                        href="https://wa.me/5522997350582"
                        className="text-pink-400 hover:text-pink-600 flex justify-center items-center"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="mr-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="text-pink-400"
                          >
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.563 4.245 1.626 6.082L0 24l5.916-1.626A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22.001c-1.963 0-3.838-.567-5.44-1.63l-.389-.206-3.514.966.966-3.514-.206-.389A9.934 9.934 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.618-4.737c-.31-.155-1.838-.906-2.122-1.01-.283-.104-.49-.155-.696.155-.206.31-.798.906-.982 1.113-.184.206-.367.226-.677.072-.31-.155-1.31-.482-2.498-1.536-.923-.823-1.546-1.837-1.73-2.147-.184-.31-.019-.477.138-.632.14-.138.31-.361.465-.542.155-.181.206-.31.31-.515.103-.206.052-.387-.026-.542-.077-.155-.696-1.678-.955-2.3-.252-.6-.507-.518-.696-.518h-.595c-.206 0-.54.077-.825.387-.283.31-1.082 1.062-1.082 2.59s1.108 3.002 1.262 3.208c.155.206 2.19 3.335 5.31 4.677.74.33 1.313.527 1.765.674.74.24 1.414.206 1.946.126.595-.09 1.838-.752 2.098-1.477.258-.725.258-1.34.180-1.477-.077-.138-.283-.206-.595-.361z" />
                          </svg>
                        </span>
                        (22) 9 9735-0582
                      </a>
                    </p>
                    <p className="text-xl mb-4">
                      Email:{" "}
                      <a
                        href="mailto:montoni@montonisolucoes.com"
                        className="text-pink-400 hover:text-pink-600"
                      >
                        montoni@montonisolucoes.com
                      </a>
                    </p>
                    <p className="text-xl">
                      Site:{" "}
                      <a
                        href="https://montonisolucoes.com"
                        className="text-pink-400 hover:text-pink-600"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        montonisolucoes.com
                      </a>
                    </p>
                  </div>
                </section>

                <footer className="bg-gray-900 py-6 text-center">
                  <div>
                    <img
                      src="/src/assets/Logo_MS.png"
                      alt="Montoni Logo"
                      className="h-12 mx-auto mb-4"
                    />
                    <p>
                      © 2025 Montoni Soluções Tech. Todos os direitos
                      reservados.
                    </p>
                  </div>
                </footer>
              </div>

              {registerModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-4">Cadastrar</h2>
                    <input
                      type="text"
                      placeholder="Nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp (ex: 99999999999)"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setRegisterModal(false);
                          setShowRegisterButton(false);
                        }}
                        className="text-pink-400 hover:text-pink-600"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleRegister}
                        className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
                      >
                        Cadastrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loginModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-4">Login</h2>
                    <input
                      type="text"
                      placeholder="WhatsApp (ex: 99999999999)"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setLoginModal(false)}
                        className="text-pink-400 hover:text-pink-600"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleLogin}
                        className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
                      >
                        Entrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {scheduleModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-4">Agendar Reunião</h2>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                    />
                    {meetingDate && (
                      <select
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                      >
                        <option value="">Selecione um horário</option>
                        {availableTimes.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      placeholder="CEP (ex: 28890000)"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                      disabled={isFetchingAddress}
                    />
                    {isFetchingAddress && (
                      <p className="text-sm text-gray-400 mb-4">
                        Buscando endereço...
                      </p>
                    )}
                    <input
                      type="text"
                      placeholder="Rua"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                      disabled
                    />
                    <input
                      type="text"
                      placeholder="Número"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                    />
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                      disabled
                    />
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                      disabled
                    />
                    <textarea
                      placeholder="Observações (opcional)"
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      className="w-full p-2 mb-4 bg-gray-700 rounded text-white"
                      rows="3"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setScheduleModal(false)}
                        className="text-pink-400 hover:text-pink-600"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSchedule}
                        className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
                      >
                        Agendar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          }
        />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
