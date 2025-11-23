import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Clipboard from "expo-clipboard"; // <-- 使用 expo-clipboard

export default function HomeScreen() {
  const [sentiment, setSentiment] = useState(null);
  const [location, setLocation] = useState(null);
  const [lastTapped, setLastTapped] = useState(null);
  const [confirmedInfo, setConfirmedInfo] = useState(null);
  const [textNote, setTextNote] = useState("");
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [jsonData, setJsonData] = useState("");

  useEffect(() => {
    (async () => {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== "granted") {
        Alert.alert("定位權限被拒絕");
        return;
      }

      if (!permission?.granted) {
        await requestPermission();
      }

      if (!mediaPermission?.granted) {
        await requestMediaPermission();
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, [permission, mediaPermission]);

  const formatCoordinates = (coords) => {
    if (!coords) return "";
    const latDir = coords.lat >= 0 ? "N" : "S";
    const lngDir = coords.lng >= 0 ? "E" : "W";
    return `${Math.abs(coords.lat).toFixed(4)}°${latDir}, ${Math.abs(coords.lng).toFixed(4)}°${lngDir}`;
  };

  const saveData = async (vlogUri, snapshotUri = null, text = null) => {
    try {
      const timestamp = new Date().toISOString();
      const record = {
        timestamp,
        sentiment,
        gps: location,
        vlog: vlogUri,
        snapshot: snapshotUri,
        text,
      };
      const existing = await AsyncStorage.getItem("records");
      const records = existing ? JSON.parse(existing) : [];
      records.push(record);
      await AsyncStorage.setItem("records", JSON.stringify(records));

      setSentiment(null);
      setLastTapped(null);
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const recordVlog = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 1,
      quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (mediaPermission?.granted) {
        await MediaLibrary.saveToLibraryAsync(uri);
      }
      saveData(uri);
    }
  };

  const takeSnapshot = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (mediaPermission?.granted) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
      saveData(null, photo.uri);
    } catch (error) {
      console.error("Snapshot error:", error);
    }
  };

  const saveText = async () => {
    if (!textNote.trim()) return Alert.alert("Please input some text first :)");
    saveData(null, null, textNote);
    setTextNote("");
  };

  const exportData = async () => {
    const existing = await AsyncStorage.getItem("records");
    if (!existing) return Alert.alert("沒有資料");
    setJsonData(JSON.stringify(JSON.parse(existing), null, 2)); // 美化 JSON
    setModalVisible(true);
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(jsonData);
    Alert.alert("Copied!", "JSON data 已複製到剪貼簿");
  };

  const moodImages = {
    1: require("../../assests/mood/1.jpg"),
    2: require("../../assests/mood/2.jpg"),
    3: require("../../assests/mood/3.jpg"),
    4: require("../../assests/mood/4.jpg"),
    5: require("../../assests/mood/5.jpg"),
  };

  const handleMoodPress = (num) => {
    if (sentiment === num && lastTapped === num) {
      const now = new Date();
      setConfirmedInfo({
        sentiment: num,
        time: now.toLocaleTimeString(),
        date: now.toLocaleDateString(),
        gps: location,
      });
      saveData(null);
    } else {
      setSentiment(num);
      setLastTapped(num);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>♡ Emotion Recorder ♡</Text>

        {permission?.granted && (
          <View style={styles.previewWrapper}>
            <CameraView ref={cameraRef} style={styles.cameraPreview} facing="front" />
            <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-around" }}>
              <Button title="Take Snapshot" onPress={takeSnapshot} />
              <Button title="Record Vlog" onPress={recordVlog} />
            </View>
          </View>
        )}

        <Text style={styles.subtitle}>How are you feeling? (press twice to save)</Text>

        <View style={styles.moodRow}>
          {[1, 2, 3, 4, 5].map((num) => (
            <View key={num} style={{ alignItems: "center" }}>
              <TouchableOpacity onPress={() => handleMoodPress(num)}>
                <Image
                  source={moodImages[num]}
                  style={[styles.moodImage, sentiment === num && styles.selectedMood]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              {confirmedInfo && confirmedInfo.sentiment === num && (
                <Text style={{ color: "white", fontSize: 12, textAlign: "center" }}>
                  {confirmedInfo.date} {confirmedInfo.time}{"\n"}
                  {confirmedInfo.gps ? formatCoordinates(confirmedInfo.gps) : ""}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={{ width: "100%", marginTop: 20 }}>
          <Text style={{ color: "white", marginBottom: 4, textAlign: "center" }}>What's on your mind?</Text>
          <TextInput
            value={textNote}
            onChangeText={setTextNote}
            placeholder="Write down your thoughts..."
            placeholderTextColor="gray"
            style={{
              backgroundColor: "#222",
              color: "white",
              padding: 10,
              borderRadius: 8,
              minHeight: 60,
              textAlignVertical: "top",
            }}
            multiline
          />
          <View style={{ height: 8 }} />
          <Button title="Save Text" onPress={saveText} />
        </View>

        <View style={{ height: 16 }} />
        <Button title="Export Data (JSON)" onPress={exportData} />

        {/* Modal for JSON display and copy */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={{ color: "white", fontSize: 12 }}>{jsonData}</Text>
              </ScrollView>
              <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 12 }}>
                <Pressable style={styles.modalButton} onPress={copyToClipboard}>
                  <Text style={{ color: "white" }}>Copy</Text>
                </Pressable>
                <Pressable style={styles.modalButton} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: "white" }}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "black",
    padding: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    textAlign: "center",
    marginVertical: 12,
    color: "white",
    fontWeight: "bold",
  },
  subtitle: {
    color: "white",
    textAlign: "center",
    marginVertical: 12,
  },
  previewWrapper: {
    width: "90%",
    height: 240,
    alignSelf: "center",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  cameraPreview: {
    flex: 1,
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moodImage: {
    width: 55,
    height: 55,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedMood: {
    borderColor: "white",
    borderWidth: 3,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#111",
    padding: 16,
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
  },
  modalButton: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
