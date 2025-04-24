import { logEvent } from "firebase/analytics";
import { get, ref, remove, set } from "firebase/database";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { analytics, database } from "./firebase";

function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [editSchedule, setEditSchedule] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editIsOnline, setEditIsOnline] = useState(false);
  const [editMeetLink, setEditMeetLink] = useState("");
  const [editObservation, setEditObservation] = useState("");
  const [editStreet, setEditStreet] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editNeighborhood, setEditNeighborhood] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCep, setEditCep] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newIsOnline, setNewIsOnline] = useState(false);
  const [newMeetLink, setNewMeetLink] = useState("");
  const [newObservation, setNewObservation] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newNeighborhood, setNewNeighborhood] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newCep, setNewCep] = useState("");

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const cleanPhoneNumber = (phone) => {
    return phone.replace(/\D/g, "");
  };

  const loadUsers = useCallback(async () => {
    try {
      const usersRef = ref(database, "clients");
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const entriesList = await Promise.all(
          Object.keys(usersData).map(async (whatsapp) => {
            const user = {
              whatsapp,
              name: usersData[whatsapp].name || "Sem nome",
              email: usersData[whatsapp].email || "Sem email",
            };

            const schedulesRef = ref(database, `clients/${whatsapp}/schedules`);
            const schedulesSnapshot = await get(schedulesRef);
            let schedules = [];

            if (schedulesSnapshot.exists()) {
              const schedulesData = schedulesSnapshot.val();
              for (const date in schedulesData) {
                const times = schedulesData[date];
                for (const time in times) {
                  const schedule = times[time];
                  schedules.push({
                    date,
                    time,
                    ...schedule,
                  });
                }
              }
            }

            if (schedules.length > 0) {
              return schedules.map((schedule) => ({
                user,
                schedule,
              }));
            } else {
              return [{ user, schedule: null }];
            }
          })
        );

        const flattenedEntries = entriesList.flat();
        flattenedEntries.sort((a, b) => a.user.name.localeCompare(b.user.name));
        setUsers(flattenedEntries);
        console.log("Lista de usuários atualizada:", flattenedEntries);
      } else {
        setUsers([]);
        console.log("Nenhum usuário encontrado no Firebase.");
      }
    } catch (error) {
      alert("Erro ao carregar usuários: " + error.message);
      console.error("Erro ao carregar usuários:", error);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, loadUsers]);

  const handleAdminLogin = () => {
    const ADMIN_PASSWORD = "@Morpheus77";
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setPassword("");
      logEvent(analytics, "admin_login");
      console.log("Admin logado com sucesso.");
    } else {
      alert("Senha incorreta!");
      setPassword("");
      console.log("Tentativa de login admin falhou: senha incorreta.");
    }
  };

  const handleSaveUser = async () => {
    if (!newName || !newEmail || !newWhatsapp) {
      alert("Por favor, preencha os campos obrigatórios do usuário.");
      console.log("Campos obrigatórios não preenchidos:", {
        newName,
        newEmail,
        newWhatsapp,
      });
      return;
    }

    if (newDate && !newTime) {
      alert("Por favor, preencha o horário do agendamento.");
      console.log("Horário do agendamento não preenchido:", {
        newDate,
        newTime,
      });
      return;
    }

    if (newIsOnline && newMeetLink && !isValidUrl(newMeetLink)) {
      alert("Por favor, insira um URL válido para o link da reunião.");
      console.log("URL inválido para o link da reunião:", newMeetLink);
      return;
    }

    const cleanedWhatsapp = cleanPhoneNumber(newWhatsapp);

    try {
      const userRef = ref(database, `clients/${cleanedWhatsapp}`);
      const userData = {
        name: newName,
        email: newEmail,
        whatsapp: cleanedWhatsapp,
      };
      await set(userRef, userData);

      let scheduleData = null;
      if (newDate && newTime) {
        const scheduleRef = ref(
          database,
          `clients/${cleanedWhatsapp}/schedules/${newDate}/${newTime}`
        );
        scheduleData = {
          date: newDate,
          time: newTime,
          isOnline: newIsOnline,
          observation: newObservation,
          ...(newIsOnline
            ? { meetLink: newMeetLink }
            : {
                address: {
                  street: newStreet,
                  number: newNumber,
                  neighborhood: newNeighborhood,
                  city: newCity,
                  cep: newCep,
                },
              }),
        };

        const scheduleSnapshot = await get(scheduleRef);
        if (scheduleSnapshot.exists()) {
          alert("Este horário já está reservado. Por favor, escolha outro.");
          console.log(`Horário reservado: ${newDate}/${newTime}`);
          return;
        }

        await set(scheduleRef, scheduleData);
        console.log(
          `Agendamento adicionado no Firebase: ${cleanedWhatsapp}/${newDate}/${newTime}`,
          scheduleData
        );
      }

      if (
        newDate &&
        newTime &&
        window.confirm(
          "Deseja enviar uma mensagem de confirmação ao cliente com os detalhes do agendamento?"
        )
      ) {
        const clientPhone = cleanedWhatsapp.startsWith("+55")
          ? cleanedWhatsapp
          : `+55${cleanedWhatsapp}`;
        let message = `Olá, ${newName}! Tudo certo com seu agendamento!\n\n`;
        message += `**Detalhes da Reunião:**\n`;
        message += `- Data: ${formatDate(newDate)}\n`;
        message += `- Horário: ${newTime}\n`;
        if (newIsOnline) {
          message += `- Modalidade: Online\n`;
          message += `- Link da reunião: ${
            newMeetLink || "Ainda não disponível"
          }\n`;
        } else {
          message += `- Modalidade: Presencial\n`;
          message += `- Endereço: ${newStreet}, ${newNumber}, ${newNeighborhood}, ${newCity} - CEP: ${newCep}\n`;
        }
        if (newObservation) {
          message += `- Observações: ${newObservation}\n`;
        }
        message += `\nEstamos ansiosos para te atender!`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=${clientPhone}&text=${encodeURIComponent(
          message
        )}`;
        window.open(whatsappUrl, "_blank");
        console.log("Mensagem de confirmação enviada para:", clientPhone);
      }

      alert(
        editUser ? "Usuário atualizado!" : "Usuário e agendamento adicionados!"
      );
      console.log(
        `Usuário ${editUser ? "atualizado" : "adicionado"} no Firebase:`,
        userData
      );

      setNewName("");
      setNewEmail("");
      setNewWhatsapp("");
      setNewDate("");
      setNewTime("");
      setNewIsOnline(false);
      setNewMeetLink("");
      setNewObservation("");
      setNewStreet("");
      setNewNumber("");
      setNewNeighborhood("");
      setNewCity("");
      setNewCep("");
      setEditUser(null);
      await loadUsers();
      logEvent(analytics, editUser ? "admin_edit_user" : "admin_add_user", {
        whatsapp: cleanedWhatsapp,
      });
      if (newDate && newTime) {
        logEvent(analytics, "admin_add_schedule", {
          whatsapp: cleanedWhatsapp,
          date: newDate,
          time: newTime,
        });
      }
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
      console.error("Erro ao salvar:", error);
    }
  };

  const handleEditUser = (user) => {
    setEditUser(user);
    setNewName(user.name);
    setNewEmail(user.email);
    setNewWhatsapp(user.whatsapp);
    console.log("Editando usuário:", user);
  };

  const handleDeleteUser = async (whatsapp) => {
    if (window.confirm("Tem certeza que deseja deletar este usuário?")) {
      try {
        const userRef = ref(database, `clients/${whatsapp}`);
        await remove(userRef);
        alert("Usuário deletado!");
        console.log(`Usuário deletado do Firebase: ${whatsapp}`);
        await loadUsers();
        logEvent(analytics, "admin_delete_user", { whatsapp });
      } catch (error) {
        alert("Erro ao deletar usuário: " + error.message);
        console.error("Erro ao deletar usuário:", error);
      }
    } else {
      console.log("Deleção de usuário cancelada:", whatsapp);
    }
  };

  const handleDeleteSchedule = async (whatsapp, date, time) => {
    if (window.confirm("Tem certeza que deseja deletar este agendamento?")) {
      try {
        const scheduleRef = ref(
          database,
          `clients/${whatsapp}/schedules/${date}/${time}`
        );
        await remove(scheduleRef);
        alert("Agendamento deletado!");
        console.log(
          `Agendamento deletado do Firebase: ${whatsapp}/${date}/${time}`
        );
        await loadUsers();
        logEvent(analytics, "admin_delete_schedule", { whatsapp, date, time });
      } catch (error) {
        alert("Erro ao deletar agendamento: " + error.message);
        console.error("Erro ao deletar agendamento:", error);
      }
    }
  };

  const handleEditSchedule = (entry) => {
    setEditSchedule(entry);
    setEditDate(entry.schedule.date);
    setEditTime(entry.schedule.time);
    setEditIsOnline(entry.schedule.isOnline);
    setEditMeetLink(entry.schedule.meetLink || "");
    setEditObservation(entry.schedule.observation || "");
    if (!entry.schedule.isOnline) {
      setEditStreet(entry.schedule.address.street || "");
      setEditNumber(entry.schedule.address.number || "");
      setEditNeighborhood(entry.schedule.address.neighborhood || "");
      setEditCity(entry.schedule.address.city || "");
      setEditCep(entry.schedule.address.cep || "");
    }
    console.log("Editando agendamento:", entry);
  };

  const handleSaveSchedule = async () => {
    if (!editDate || !editTime) {
      alert("Por favor, preencha a data e o horário.");
      console.log("Data ou horário não preenchidos:", { editDate, editTime });
      return;
    }

    if (editIsOnline && editMeetLink && !isValidUrl(editMeetLink)) {
      alert("Por favor, insira um URL válido para o link da reunião.");
      console.log("URL inválido para o link da reunião:", editMeetLink);
      return;
    }

    try {
      const { user, schedule } = editSchedule;
      const originalDate = schedule.date;
      const originalTime = schedule.time;

      const scheduleRef = ref(
        database,
        `clients/${user.whatsapp}/schedules/${editDate}/${editTime}`
      );

      if (editDate !== originalDate || editTime !== originalTime) {
        const scheduleSnapshot = await get(scheduleRef);
        if (scheduleSnapshot.exists()) {
          alert("Este horário já está reservado. Por favor, escolha outro.");
          console.log(`Horário reservado: ${editDate}/${editTime}`);
          return;
        }

        const oldScheduleRef = ref(
          database,
          `clients/${user.whatsapp}/schedules/${originalDate}/${originalTime}`
        );
        await remove(oldScheduleRef);
        console.log(
          `Agendamento antigo removido: ${user.whatsapp}/${originalDate}/${originalTime}`
        );
      }

      const scheduleData = {
        date: editDate,
        time: editTime,
        isOnline: editIsOnline,
        observation: editObservation,
        ...(editIsOnline
          ? { meetLink: editMeetLink }
          : {
              address: {
                street: editStreet,
                number: editNumber,
                neighborhood: editNeighborhood,
                city: editCity,
                cep: editCep,
              },
            }),
      };

      await set(scheduleRef, scheduleData);
      console.log(
        `Agendamento atualizado no Firebase: ${user.whatsapp}/${editDate}/${editTime}`,
        scheduleData
      );

      const cleanedPhone = cleanPhoneNumber(user.whatsapp);
      const clientPhone = cleanedPhone.startsWith("+55")
        ? cleanedPhone
        : `+55${cleanedPhone}`;

      const hasAddressChanged =
        !editIsOnline &&
        (editStreet !== (schedule.address?.street || "") ||
          editNumber !== (schedule.address?.number || "") ||
          editNeighborhood !== (schedule.address?.neighborhood || "") ||
          editCity !== (schedule.address?.city || "") ||
          editCep !== (schedule.address?.cep || ""));

      const hasSignificantChanges =
        editDate !== schedule.date ||
        editTime !== schedule.time ||
        editObservation !== (schedule.observation || "") ||
        (editIsOnline && editMeetLink !== (schedule.meetLink || ""));

      if (hasAddressChanged) {
        if (
          window.confirm(
            "O endereço da reunião foi alterado. Deseja notificar o cliente?"
          )
        ) {
          const message =
            `Olá, ${user.name}! Houve uma alteração no endereço da sua reunião presencial.\n\n` +
            `**Detalhes Atualizados:**\n` +
            `- Data: ${formatDate(editDate)}\n` +
            `- Horário: ${editTime}\n` +
            `- Novo Endereço: ${editStreet}, ${editNumber}, ${editNeighborhood}, ${editCity} - CEP: ${editCep}\n` +
            (editObservation ? `- Observações: ${editObservation}\n` : "") +
            `\nEstamos ansiosos para te atender!`;

          const whatsappUrl = `https://api.whatsapp.com/send?phone=${clientPhone}&text=${encodeURIComponent(
            message
          )}`;
          window.open(whatsappUrl, "_blank");
          console.log("Mensagem de alteração enviada para:", clientPhone);
        }
      }

      if (hasSignificantChanges) {
        if (
          window.confirm(
            "Deseja enviar uma mensagem de confirmação ao cliente?"
          )
        ) {
          let message = `Olá, ${user.name}! Tudo certo com seu agendamento!\n\n`;
          message += `**Detalhes da Reunião:**\n`;
          message += `- Data: ${formatDate(editDate)}\n`;
          message += `- Horário: ${editTime}\n`;
          if (editIsOnline) {
            message += `- Modalidade: Online\n`;
            message += `- Link da reunião: ${
              editMeetLink || "Ainda não disponível"
            }\n`;
          } else {
            message += `- Modalidade: Presencial\n`;
            message += `- Endereço: ${editStreet}, ${editNumber}, ${editNeighborhood}, ${editCity} - CEP: ${editCep}\n`;
          }
          if (editObservation) {
            message += `- Observações: ${editObservation}\n`;
          }
          message += `\nEstamos ansiosos para te atender!`;

          const whatsappUrl = `https://api.whatsapp.com/send?phone=${clientPhone}&text=${encodeURIComponent(
            message
          )}`;
          window.open(whatsappUrl, "_blank");
          console.log("Mensagem de confirmação enviada para:", clientPhone);
        }
      }

      alert("Agendamento atualizado com sucesso!");
      setEditSchedule(null);
      setEditDate("");
      setEditTime("");
      setEditIsOnline(false);
      setEditMeetLink("");
      setEditObservation("");
      setEditStreet("");
      setEditNumber("");
      setEditNeighborhood("");
      setEditCity("");
      setEditCep("");
      await loadUsers();
      logEvent(analytics, "admin_edit_schedule", {
        whatsapp: user.whatsapp,
        date: editDate,
        time: editTime,
      });
    } catch (error) {
      alert("Erro ao atualizar agendamento: " + error.message);
      console.error("Erro ao atualizar agendamento:", error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center px-4 sm:px-6">
        <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4">Login do Administrador</h2>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-4 bg-gray-700 rounded text-white text-base"
          />
          <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-3">
            <Link
              to="/"
              className="w-full sm:w-auto flex items-center justify-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Voltar
            </Link>
            <button
              onClick={handleAdminLogin}
              className="w-full sm:w-auto flex items-center justify-center bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition-colors duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen w-full">
      <div className="min-w-[320px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Logotipo opcional */}
        <div className="flex justify-center mb-6">
          <img src="/path/to/logo.png" alt="Logo" className="logo" />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h2 className="text-3xl font-bold mb-4 sm:mb-0">
            Painel do Administrador
          </h2>
          <Link
            to="/"
            className="flex items-center bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Voltar para Home
          </Link>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h3 className="text-xl font-bold mb-4">
            {editUser ? "Editar Usuário" : "Adicionar Usuário e Agendamento"}
          </h3>
          <input
            type="text"
            placeholder="Nome"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
          />
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
          />
          <input
            type="text"
            placeholder="WhatsApp (ex: 22999998352)"
            value={newWhatsapp}
            onChange={(e) => setNewWhatsapp(e.target.value)}
            className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
            disabled={editUser}
          />
          {!editUser && (
            <>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
              />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
              />
              <div className="flex flex-col space-y-2 mb-3">
                <label className="font-semibold">Modalidade:</label>
                <div className="flex space-x-4">
                  <label>
                    <input
                      type="radio"
                      value="presencial"
                      checked={!newIsOnline}
                      onChange={() => setNewIsOnline(false)}
                      className="mr-1"
                    />
                    Presencial
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="online"
                      checked={newIsOnline}
                      onChange={() => setNewIsOnline(true)}
                      className="mr-1"
                    />
                    Online
                  </label>
                </div>
              </div>
              {newIsOnline ? (
                <input
                  type="text"
                  placeholder="Link do Google Meet"
                  value={newMeetLink}
                  onChange={(e) => setNewMeetLink(e.target.value)}
                  className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
                />
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Rua"
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
                  />
                  <input
                    type="text"
                    placeholder="Número"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
                  />
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={newNeighborhood}
                    onChange={(e) => setNewNeighborhood(e.target.value)}
                    className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
                  />
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
                  />
                  <input
                    type="text"
                    placeholder="CEP"
                    value={newCep}
                    onChange={(e) => setNewCep(e.target.value)}
                    className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
                  />
                </>
              )}
              <textarea
                placeholder="Observações"
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                className="w-full p-3 mb-3 bg-gray-700 rounded text-white text-base"
              />
            </>
          )}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            {editUser && (
              <button
                onClick={() => {
                  setEditUser(null);
                  setNewName("");
                  setNewEmail("");
                  setNewWhatsapp("");
                }}
                className="w-full sm:w-auto flex items-center justify-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Cancelar
              </button>
            )}
            <button
              onClick={handleSaveUser}
              className="w-full sm:w-auto flex items-center justify-center bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition-colors duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {editUser ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </div>

        {editSchedule && (
          <div className="bg-gray-800 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-bold mb-4">Editar Agendamento</h3>
            <div className="grid grid-cols-1 gap-3">
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded text-white"
              />
              <input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded text-white"
              />
              <div className="flex flex-col space-y-2">
                <label className="font-semibold">Modalidade:</label>
                <div className="flex space-x-4">
                  <label>
                    <input
                      type="radio"
                      value="presencial"
                      checked={!editIsOnline}
                      onChange={() => setEditIsOnline(false)}
                      className="mr-1"
                    />
                    Presencial
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="online"
                      checked={editIsOnline}
                      onChange={() => setEditIsOnline(true)}
                      className="mr-1"
                    />
                    Online
                  </label>
                </div>
              </div>
              {editIsOnline ? (
                <input
                  type="text"
                  placeholder="Link do Google Meet"
                  value={editMeetLink}
                  onChange={(e) => setEditMeetLink(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded text-white"
                />
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Rua"
                    value={editStreet}
                    onChange={(e) => setEditStreet(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded text-white"
                  />
                  <input
                    type="text"
                    placeholder="Número"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded text-white"
                  />
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={editNeighborhood}
                    onChange={(e) => setEditNeighborhood(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded text-white"
                  />
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded text-white"
                  />
                  <input
                    type="text"
                    placeholder="CEP"
                    value={editCep}
                    onChange={(e) => setEditCep(e.target.value)}
                    className="w-full p-3 bg-gray-700 rounded text-white"
                  />
                </>
              )}
              <textarea
                placeholder="Observações"
                value={editObservation}
                onChange={(e) => setEditObservation(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded text-white"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-4">
              <button
                onClick={() => {
                  setEditSchedule(null);
                  setEditDate("");
                  setEditTime("");
                  setEditIsOnline(false);
                  setEditMeetLink("");
                  setEditObservation("");
                  setEditStreet("");
                  setEditNumber("");
                  setEditNeighborhood("");
                  setEditCity("");
                  setEditCep("");
                }}
                className="w-full sm:w-auto flex items-center justify-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Cancelar
              </button>
              <button
                onClick={handleSaveSchedule}
                className="w-full sm:w-auto flex items-center justify-center bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition-colors duration-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Salvar
              </button>
            </div>
          </div>
        )}

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">
            Lista de Usuários e Agendamentos
          </h3>
          {users.length === 0 ? (
            <p>Nenhum usuário cadastrado.</p>
          ) : (
            <div className="space-y-4 md:overflow-x-auto">
              <table className="w-full text-left hidden md:table">
                <thead>
                  <tr>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">WhatsApp</th>
                    <th className="p-2">Data</th>
                    <th className="p-2">Horário</th>
                    <th className="p-2">Detalhes</th>
                    <th className="p-2">Observações</th>
                    <th className="p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((entry, index) => (
                    <tr
                      key={`${entry.user.whatsapp}-${
                        entry.schedule
                          ? `${entry.schedule.date}-${entry.schedule.time}`
                          : index
                      }`}
                      className="border-t border-gray-700"
                    >
                      <td className="p-2">{entry.user.name}</td>
                      <td className="p-2">{entry.user.email}</td>
                      <td className="p-2">{entry.user.whatsapp}</td>
                      <td className="p-2">
                        {entry.schedule ? formatDate(entry.schedule.date) : "—"}
                      </td>
                      <td className="p-2">
                        {entry.schedule ? entry.schedule.time : "—"}
                      </td>
                      <td className="p-2">
                        {entry.schedule ? (
                          entry.schedule.isOnline ? (
                            <span>
                              Online - Link:{" "}
                              <a
                                href={entry.schedule.meetLink}
                                className="text-pink-400 hover:text-pink-600"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {entry.schedule.meetLink || "Não disponível"}
                              </a>
                            </span>
                          ) : (
                            <span>
                              Presencial - {entry.schedule.address.street},{" "}
                              {entry.schedule.address.number}
                            </span>
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-2">
                        {entry.schedule
                          ? entry.schedule.observation || "Nenhuma"
                          : "—"}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditUser(entry.user)}
                            className="p-2 text-pink-400 hover:text-pink-600 transition-colors duration-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteUser(entry.user.whatsapp)
                            }
                            className="p-2 text-red-400 hover:text-red-600 transition-colors duration-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                          {entry.schedule && (
                            <>
                              <button
                                onClick={() => handleEditSchedule(entry)}
                                className="p-2 text-blue-400 hover:text-blue-600 transition-colors duration-200"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteSchedule(
                                    entry.user.whatsapp,
                                    entry.schedule.date,
                                    entry.schedule.time
                                  )
                                }
                                className="p-2 text-red-400 hover:text-red-600 transition-colors duration-200"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M6 2L2 6l10 10L2 22l4 4 10-10 10 10 4-4-10-10L22 6l-4-4-10 10L6 2z" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="md:hidden space-y-4">
                {users.map((entry, index) => (
                  <div
                    key={`${entry.user.whatsapp}-${
                      entry.schedule
                        ? `${entry.schedule.date}-${entry.schedule.time}`
                        : index
                    }`}
                    className="bg-gray-700 p-4 rounded-lg"
                  >
                    <p>
                      <strong>Nome:</strong> {entry.user.name}
                    </p>
                    <p>
                      <strong>Data:</strong>{" "}
                      {entry.schedule ? formatDate(entry.schedule.date) : "—"}
                    </p>
                    <p>
                      <strong>Horário:</strong>{" "}
                      {entry.schedule ? entry.schedule.time : "—"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => handleEditUser(entry.user)}
                        className="p-2 text-pink-400 hover:text-pink-600 transition-colors duration-200"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(entry.user.whatsapp)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors duration-200"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                      {entry.schedule && (
                        <>
                          <button
                            onClick={() => handleEditSchedule(entry)}
                            className="p-2 text-blue-400 hover:text-blue-600 transition-colors duration-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteSchedule(
                                entry.user.whatsapp,
                                entry.schedule.date,
                                entry.schedule.time
                              )
                            }
                            className="p-2 text-red-400 hover:text-red-600 transition-colors duration-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M6 2L2 6l10 10L2 22l4 4 10-10 10 10 4-4-10-10L22 6l-4-4-10 10L6 2z" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
