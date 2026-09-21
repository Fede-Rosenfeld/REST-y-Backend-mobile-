import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import {
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// -----------------------------------------------------------------------------
// Tipos y configuracion
// -----------------------------------------------------------------------------

// Este tipo representa exactamente el objeto que devuelve la API.
interface Person {
  id: number;
  firstName: string;
  lastName: string;
  age: number | null;
  arrivalDate: string | null;
  isWorking: boolean;
}

// Puerto donde escucha el backend de Express.
const API_PORT = 3000;

// De donde sale la URL del backend:
//
// 1. Si el archivo .env define EXPO_PUBLIC_API_URL, mandamos ese valor.
// 2. Si no, la deducimos sola: usamos la misma IP desde la que Expo sirve la app
//    y le cambiamos el puerto por el 3000. Asi funciona igual en el navegador
//    (localhost) que en el celular con Expo Go (la IP de la PC en la wifi),
//    sin tener que escribir la IP a mano.
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return fromEnv;
  }

  // hostUri es algo como "192.168.1.25:8081" o "localhost:8081".
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:${API_PORT}`;
  }

  // Ultimo recurso: sirve para la version web.
  return `http://localhost:${API_PORT}`;
}

const API_URL = resolveApiUrl();

// Aviso que se muestra arriba del formulario.
// Reemplaza a Alert porque en la version web Alert no muestra nada.
interface Notice {
  type: 'error' | 'ok';
  text: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  // people es la lista que FlatList va a dibujar en pantalla.
  const [people, setPeople] = useState<Person[]>([]);

  // Estos estados representan los valores de los inputs del formulario.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [arrivalDate, setArrivalDate] = useState(today());
  const [isWorking, setIsWorking] = useState(false);

  // Mensaje de error o de exito visible dentro de la pantalla.
  const [notice, setNotice] = useState<Notice | null>(null);

  // Persona elegida para borrar. Si no es null, el modal se muestra.
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);

  // ---------------------------------------------------------------------------
  // Comunicacion con la API
  // ---------------------------------------------------------------------------

  // GET: pide la lista al backend y la guarda en el estado people.
  async function loadPeople() {
    const response = await fetch(`${API_URL}/api/personas`);

    if (!response.ok) {
      throw new Error('No se pudo cargar la lista');
    }

    setPeople(await response.json());
  }

  // Al abrir la pantalla hacemos el primer GET.
  useEffect(() => {
    loadPeople().catch(() =>
      setNotice({ type: 'error', text: `No se pudo conectar con ${API_URL}` }),
    );
  }, []);

  // POST: envia el formulario, limpia los inputs y vuelve a pedir la lista.
  async function addPerson() {
    if (!firstName.trim() || !lastName.trim() || !arrivalDate.trim()) {
      setNotice({ type: 'error', text: 'Completa nombre, apellido y fecha' });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          // Si el input quedo vacio mandamos null y la edad queda sin cargar.
          age: age.trim() ? Number(age.trim()) : null,
          arrivalDate,
          isWorking,
        }),
      });

      if (!response.ok) {
        setNotice({ type: 'error', text: 'No se pudo guardar el enano' });
        return;
      }

      // Dejamos el formulario listo para cargar otro registro.
      setFirstName('');
      setLastName('');
      setAge('');
      setArrivalDate(today());
      setIsWorking(false);
      setNotice({ type: 'ok', text: 'Enano registrado en la fortaleza' });

      // Refrescamos FlatList para mostrar el nuevo registro.
      await loadPeople();
    } catch {
      setNotice({ type: 'error', text: `No se pudo conectar con ${API_URL}` });
    }
  }

  // PATCH: cambia solamente isWorking, sin reemplazar toda la persona.
  async function toggleWorking(person: Person) {
    try {
      const response = await fetch(`${API_URL}/api/personas/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isWorking: !person.isWorking }),
      });

      if (!response.ok) {
        setNotice({ type: 'error', text: 'No se pudo actualizar el estado de trabajo' });
        return;
      }

      // El backend responde con el registro actualizado; volvemos a cargar todo
      // para mantener la pantalla sincronizada con la base de datos.
      await loadPeople();
    } catch {
      setNotice({ type: 'error', text: `No se pudo conectar con ${API_URL}` });
    }
  }

  // DELETE: se ejecuta recien cuando el usuario confirma en el modal.
  async function confirmDelete() {
    if (!personToDelete) return;

    const target = personToDelete;

    try {
      const response = await fetch(`${API_URL}/api/personas/${target.id}`, {
        method: 'DELETE',
      });

      // Cerramos el modal pase lo que pase para no dejarlo trabado.
      setPersonToDelete(null);

      if (!response.ok) {
        setNotice({ type: 'error', text: 'No se pudo borrar el enano' });
        return;
      }

      setNotice({
        type: 'ok',
        text: `${target.firstName} ${target.lastName} fue borrado`,
      });

      // Actualizamos la lista para que la tarjeta desaparezca.
      await loadPeople();
    } catch {
      setPersonToDelete(null);
      setNotice({ type: 'error', text: `No se pudo conectar con ${API_URL}` });
    }
  }

  // ---------------------------------------------------------------------------
  // Interfaz: formulario + listado + modal de confirmacion
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.logo}>
        {'+--------------------------+\n'}
        {'|      DWARF FORTRESS      |\n'}
        {'|       ASCII LEDGER       |\n'}
        {'+--------------------------+'}
      </Text>

      <Text style={styles.heading}>[ REGISTRO DE LA FORTALEZA ]</Text>
      <Text style={styles.subtitle}>Llegadas, labores y destinos de los enanos</Text>

      {/* Aviso visible de error o de exito. Se toca para cerrarlo. */}
      {notice && (
        <TouchableOpacity
          style={[styles.notice, notice.type === 'error' ? styles.noticeError : styles.noticeOk]}
          onPress={() => setNotice(null)}
        >
          <Text style={styles.noticeText}>
            {notice.type === 'error' ? '! ' : '> '}
            {notice.text}
          </Text>
        </TouchableOpacity>
      )}

      {/* Formulario: cada input modifica un estado local. */}
      <TextInput
        style={styles.input}
        placeholder="Nombre del enano"
        placeholderTextColor="#8b806d"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Apellido del enano"
        placeholderTextColor="#8b806d"
        value={lastName}
        onChangeText={setLastName}
      />

      {/* Parte A: input nuevo para cargar la edad del enano. */}
      <TextInput
        style={styles.input}
        placeholder="Edad del enano [anios]"
        placeholderTextColor="#8b806d"
        keyboardType="numeric"
        value={age}
        // Dejamos pasar solo digitos para no mandar texto al backend.
        onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ''))}
      />

      <TextInput
        style={styles.input}
        placeholder="Fecha de llegada [AAAA-MM-DD]"
        placeholderTextColor="#8b806d"
        value={arrivalDate}
        onChangeText={setArrivalDate}
      />

      <View style={styles.switchRow}>
        <Text style={styles.label}>[ESTA EN LABORES?]</Text>
        <Switch value={isWorking} onValueChange={setIsWorking} />
      </View>

      <TouchableOpacity style={styles.actionButton} onPress={addPerson}>
        <Text style={styles.actionText}>[ TALLAR NUEVO REGISTRO ]</Text>
      </TouchableOpacity>

      {/* FlatList recorre people y crea una tarjeta por cada persona. */}
      <FlatList
        style={styles.list}
        data={people}
        keyExtractor={(person) => String(person.id)}
        ListEmptyComponent={<Text style={styles.empty}>La fortaleza no tiene registros.</Text>}
        renderItem={({ item }) => (
          <View style={styles.personCard}>
            <Text style={styles.personName}>+ {item.firstName} {item.lastName}</Text>
            <Text style={styles.personInfo}>
              | Edad: {item.age === null ? 'sin registrar' : `${item.age} anios`}
            </Text>
            <Text style={styles.personInfo}>
              | Llegada: {item.arrivalDate?.slice(0, 10) ?? 'sin fecha'}
            </Text>
            <Text style={styles.personInfo}>
              | Oficio: {item.isWorking ? 'EN LABORES' : 'SIN LABOR'}
            </Text>

            {/* Este boton dispara el PATCH de la persona seleccionada. */}
            <TouchableOpacity style={styles.smallButton} onPress={() => toggleWorking(item)}>
              <Text style={styles.smallButtonText}>
                {item.isWorking ? '[ RETIRAR DE LABORES ]' : '[ ASIGNAR A LABORES ]'}
              </Text>
            </TouchableOpacity>

            {/* Parte B: no borra directo, primero abre el modal de confirmacion. */}
            <TouchableOpacity
              style={[styles.smallButton, styles.deleteButton]}
              onPress={() => setPersonToDelete(item)}
            >
              <Text style={[styles.smallButtonText, styles.deleteButtonText]}>
                [ BORRAR DEL REGISTRO ]
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal de confirmacion: aparece solo cuando personToDelete tiene valor. */}
      <Modal
        visible={personToDelete !== null}
        transparent
        animationType="fade"
        // onRequestClose maneja el boton fisico "atras" de Android.
        onRequestClose={() => setPersonToDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>[ CONFIRMAR BORRADO ]</Text>

            <Text style={styles.modalText}>
              Seguro que queres borrar a {personToDelete?.firstName} {personToDelete?.lastName} de
              la base de datos?
            </Text>
            <Text style={styles.modalWarning}>Esta accion no se puede deshacer.</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPersonToDelete(null)}
              >
                <Text style={styles.cancelButtonText}>[ CANCELAR ]</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmButtonText}>[ SI, BORRAR ]</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Estilos visuales de la fortaleza
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 45, backgroundColor: '#151515' },
  logo: { marginBottom: 18, color: '#d1b274', fontFamily: 'monospace', fontSize: 15, lineHeight: 18, textAlign: 'center' },
  heading: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', color: '#e0c58b' },
  subtitle: { marginBottom: 20, color: '#a99b82', fontFamily: 'monospace' },
  notice: { marginBottom: 12, padding: 10, borderWidth: 1 },
  noticeError: { borderColor: '#a3462f', backgroundColor: '#3a1c14' },
  noticeOk: { borderColor: '#5d7a3a', backgroundColor: '#1e2a14' },
  noticeText: { color: '#eee1c2', fontFamily: 'monospace', fontSize: 12 },
  input: { marginBottom: 10, padding: 12, borderWidth: 1, borderColor: '#62563f', borderRadius: 0, backgroundColor: '#242424', color: '#eee1c2', fontFamily: 'monospace' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingVertical: 4 },
  label: { color: '#c9b27c', fontFamily: 'monospace' },
  actionButton: { padding: 13, borderWidth: 1, borderColor: '#d1b274', backgroundColor: '#4c3b22' },
  actionText: { color: '#f6e8bf', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold' },
  list: { marginTop: 20 },
  empty: { color: '#a99b82', fontFamily: 'monospace' },
  personCard: { marginBottom: 12, padding: 15, borderWidth: 1, borderColor: '#62563f', backgroundColor: '#202020' },
  personName: { fontSize: 19, fontWeight: 'bold', color: '#e0c58b', fontFamily: 'monospace' },
  personInfo: { marginTop: 5, color: '#bdb19a', fontFamily: 'monospace' },
  smallButton: { marginTop: 10, padding: 9, borderWidth: 1, borderColor: '#725b35', backgroundColor: '#302719' },
  smallButtonText: { color: '#d1b274', textAlign: 'center', fontFamily: 'monospace', fontSize: 12 },
  deleteButton: { borderColor: '#8c3b26', backgroundColor: '#2b1410' },
  deleteButtonText: { color: '#d98b6f' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.75)' },
  modalBox: { width: '100%', maxWidth: 420, padding: 20, borderWidth: 1, borderColor: '#d1b274', backgroundColor: '#1b1b1b' },
  modalTitle: { marginBottom: 12, color: '#e0c58b', fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  modalText: { color: '#eee1c2', fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
  modalWarning: { marginTop: 10, color: '#d98b6f', fontFamily: 'monospace', fontSize: 12 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalButton: { flex: 1, padding: 11, borderWidth: 1 },
  cancelButton: { borderColor: '#725b35', backgroundColor: '#302719' },
  cancelButtonText: { color: '#d1b274', textAlign: 'center', fontFamily: 'monospace', fontSize: 12 },
  confirmButton: { borderColor: '#8c3b26', backgroundColor: '#5c2418' },
  confirmButtonText: { color: '#f4c9b8', textAlign: 'center', fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold' },
});
