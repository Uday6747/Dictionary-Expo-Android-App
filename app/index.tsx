import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Phonetic {
  text?: string;
  audio?: string;
}

interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

interface WordData {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  origin?: string;
  meanings: Meaning[];
}

export default function DictionaryApp() {
  const [searchTerm, setSearchTerm] = useState('');
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadHistory();
    loadFavorites();
  }, []);

  const loadHistory = async () => {
    const history = await AsyncStorage.getItem('searchHistory');
    if (history) setSearchHistory(JSON.parse(history));
  };

  const saveHistory = async (history: string[]) => {
    await AsyncStorage.setItem('searchHistory', JSON.stringify(history));
  };

  const loadFavorites = async () => {
    const fav = await AsyncStorage.getItem('favorites');
    if (fav) setFavorites(JSON.parse(fav));
  };

  const saveFavorites = async (fav: string[]) => {
    await AsyncStorage.setItem('favorites', JSON.stringify(fav));
  };

  const searchWord = async (word: string) => {
    if (!word.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (!response.ok) throw new Error('Word not found');
      const data = await response.json();
      setWordData(data[0]);
      const newHistory = [word, ...searchHistory.filter((item) => item !== word)].slice(0, 5);
      setSearchHistory(newHistory);
      saveHistory(newHistory);
    } catch (err) {
      setError('Word not found. Try another.');
      setWordData(null);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (url: string) => {
    const { sound } = await Audio.Sound.createAsync({ uri: url.startsWith('//') ? `https:${url}` : url });
    await sound.playAsync();
  };

  const toggleFavorite = async (word: string) => {
    let updated = [...favorites];
    if (favorites.includes(word)) {
      updated = favorites.filter((w) => w !== word);
    } else {
      updated.push(word);
    }
    setFavorites(updated);
    saveFavorites(updated);
  };

  return (
    <ScrollView style={[styles.container, isDark && styles.darkContainer]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="menu-book" size={32} color="#3b82f6" />
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Dictionary</Text>
      </View>
      <Text style={[styles.subtitle, isDark && styles.darkText]}>Discover meanings, pronunciations, and examples</Text>

      {/* Search Form */}
      <View style={[styles.card, isDark && styles.darkCard]}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={[styles.input, isDark && styles.darkInput]}
            placeholder="Enter a word to search..."
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <TouchableOpacity 
            style={styles.searchButton} 
            onPress={() => searchWord(searchTerm)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search History */}
      {searchHistory.length > 0 && (
        <View style={[styles.card, isDark && styles.darkCard]}>
          <View style={styles.historyHeader}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Text style={[styles.historyTitle, isDark && styles.darkText]}>Recent Searches</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyItems}>
            {searchHistory.map((word, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.historyItem, isDark && styles.darkHistoryItem]}
                onPress={() => {
                  setSearchTerm(word);
                  searchWord(word);
                }}
              >
                <Text style={[styles.historyText, isDark && styles.darkText]}>{word}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={[styles.card, styles.errorCard, isDark && styles.darkErrorCard]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Word Definition */}
      {wordData && (
        <View style={[styles.card, isDark && styles.darkCard]}>
          {/* Word Header */}
          <View style={styles.wordHeader}>
            <View>
              <Text style={[styles.wordTitle, isDark && styles.darkText]}>{wordData.word}</Text>
              {wordData.phonetic && (
                <Text style={[styles.phonetic, isDark && styles.darkSecondaryText]}>
                  /{wordData.phonetic}/
                </Text>
              )}
            </View>
            {wordData.phonetics.find((p) => p.audio) && (
              <TouchableOpacity
                style={styles.audioButton}
                onPress={() => {
                  const audioPhonetic = wordData.phonetics.find((p) => p.audio);
                  if (audioPhonetic?.audio) {
                    playAudio(audioPhonetic.audio);
                  }
                }}
              >
                <Ionicons name="volume-high-outline" size={20} color={isDark ? '#3b82f6' : '#2563eb'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Origin */}
          {wordData.origin && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Origin</Text>
              <Text style={[styles.originText, isDark && styles.darkSecondaryText, styles.italic]}>
                {wordData.origin}
              </Text>
            </View>
          )}

          {/* Meanings */}
          {wordData.meanings.map((meaning, meaningIndex) => (
            <View key={meaningIndex} style={styles.meaningSection}>
              <View style={styles.partOfSpeechContainer}>
                <Text style={[styles.partOfSpeech, isDark && styles.darkText]}>{meaning.partOfSpeech}</Text>
              </View>

              {meaning.definitions.map((definition, defIndex) => (
                <View key={defIndex} style={styles.definitionContainer}>
                  <View style={styles.definitionBullet} />
                  <View style={styles.definitionContent}>
                    <Text style={[styles.definitionText, isDark && styles.darkText]}>
                      {definition.definition}
                    </Text>

                    {definition.example && (
                      <Text style={[styles.exampleText, isDark && styles.darkSecondaryText, styles.italic]}>
                        Example: "{definition.example}"
                      </Text>
                    )}

                    {definition.synonyms && definition.synonyms.length > 0 && (
                      <View style={styles.synAntContainer}>
                        <Text style={[styles.synAntLabel, { color: '#10b981' }]}>Synonyms: </Text>
                        <Text style={[styles.synAntText, isDark && styles.darkSecondaryText]}>
                          {definition.synonyms.join(", ")}
                        </Text>
                      </View>
                    )}

                    {definition.antonyms && definition.antonyms.length > 0 && (
                      <View style={styles.synAntContainer}>
                        <Text style={[styles.synAntLabel, { color: '#ef4444' }]}>Antonyms: </Text>
                        <Text style={[styles.synAntText, isDark && styles.darkSecondaryText]}>
                          {definition.antonyms.join(", ")}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}

              {meaningIndex < wordData.meanings.length - 1 && (
                <View style={[styles.separator, isDark && styles.darkSeparator]} />
              )}
            </View>
          ))}

          {/* Additional Phonetics */}
          {wordData.phonetics.length > 1 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Pronunciations</Text>
              <View style={styles.phoneticsContainer}>
                {wordData.phonetics.map((phonetic, index) => (
                  <View key={index} style={styles.phoneticItem}>
                    {phonetic.text && (
                      <Text style={[styles.phoneticText, isDark && styles.darkSecondaryText]}>
                        /{phonetic.text}/
                      </Text>
                    )}
                    {phonetic.audio && (
                      <TouchableOpacity
                        style={styles.smallAudioButton}
                        onPress={() => playAudio(phonetic.audio!)}
                      >
                        <Ionicons name="volume-high-outline" size={16} color={isDark ? '#3b82f6' : '#2563eb'} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, isDark && styles.darkSecondaryText]}>
          Powered by Free Dictionary API
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f9ff',
  },
  darkContainer: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#1e293b',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#475569',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#1e293b',
    shadowColor: '#64748b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingLeft: 40,
    paddingRight: 12,
    color: '#1e293b',
  },
  darkInput: {
    backgroundColor: '#334155',
    borderColor: '#475569',
    color: '#f8fafc',
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 8,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  historyItems: {
    flexDirection: 'row',
  },
  historyItem: {
    backgroundColor: '#e0f2fe',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  darkHistoryItem: {
    backgroundColor: '#1e40af',
  },
  historyText: {
    color: '#0369a1',
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
  darkErrorCard: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wordTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  phonetic: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  darkSecondaryText: {
    color: '#94a3b8',
  },
  audioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1e293b',
  },
  originText: {
    color: '#64748b',
  },
  italic: {
    fontStyle: 'italic',
  },
  meaningSection: {
    marginBottom: 20,
  },
  partOfSpeechContainer: {
    marginBottom: 12,
  },
  partOfSpeech: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  definitionContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  definitionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginTop: 8,
    marginRight: 12,
  },
  definitionContent: {
    flex: 1,
  },
  definitionText: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  synAntContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  synAntLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  synAntText: {
    fontSize: 14,
    color: '#64748b',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  darkSeparator: {
    backgroundColor: '#334155',
  },
  phoneticsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  phoneticItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneticText: {
    color: '#64748b',
    marginRight: 8,
  },
  smallAudioButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 24,
    marginBottom: 64,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
  },
  darkText: {
    color: '#f8fafc',
  },
});

/*
New Style - by v0.dev - Corrected Code - can be used
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Phonetic {
  text?: string;
  audio?: string;
}

interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
}

interface WordData {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  origin?: string;
  meanings: Meaning[];
}

export default function DictionaryApp() {
  const [searchTerm, setSearchTerm] = useState('');
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    loadHistory();
    loadFavorites();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) setSearchHistory(JSON.parse(history));
    } catch (error) {
      console.error('Failed to load history', error);
    }
  };

  const saveHistory = async (history: string[]) => {
    try {
      await AsyncStorage.setItem('searchHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const fav = await AsyncStorage.getItem('favorites');
      if (fav) setFavorites(JSON.parse(fav));
    } catch (error) {
      console.error('Failed to load favorites', error);
    }
  };

  const saveFavorites = async (fav: string[]) => {
    try {
      await AsyncStorage.setItem('favorites', JSON.stringify(fav));
    } catch (error) {
      console.error('Failed to save favorites', error);
    }
  };

  const searchWord = async (word: string) => {
    if (!word.trim()) return;

    setLoading(true);

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
      );

      if (!response.ok) {
        throw new Error('Word not found');
      }

      const data = await response.json();
      setWordData(data[0]);

      // Update search history
      const newHistory = [word, ...searchHistory.filter(item => item !== word)].slice(0, 5);
      setSearchHistory(newHistory);
      saveHistory(newHistory);
    } catch (err) {
      Alert.alert('Error', 'Word not found. Please try another word.');
      setWordData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    searchWord(searchTerm);
  };

  const playAudio = async (audioUrl: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl,
      });
      await sound.playAsync();
    } catch (error) {
      console.log('Audio playback failed:', error);
      Alert.alert('Error', 'Could not play audio');
    }
  };

  const toggleFavorite = async (word: string) => {
    const updated = favorites.includes(word)
      ? favorites.filter(w => w !== word)
      : [...favorites, word];
    
    setFavorites(updated);
    saveFavorites(updated);
  };

  const DefinitionItem = ({ definition, index }: { definition: Definition; index: number }) => (
    <View key={index} style={styles.definitionContainer}>
      <Text style={styles.definitionText}>
        {index + 1}. {definition.definition}
      </Text>
      
      {definition.example && (
        <Text style={styles.exampleText}>
          <Text style={styles.exampleLabel}>Example: </Text>
          "{definition.example}"
        </Text>
      )}

      {definition.synonyms && definition.synonyms.length > 0 && (
        <Text style={styles.synonymsText}>
          <Text style={styles.synonymsLabel}>Synonyms: </Text>
          {definition.synonyms.join(', ')}
        </Text>
      )}

      {definition.antonyms && definition.antonyms.length > 0 && (
        <Text style={styles.antonymsText}>
          <Text style={styles.antonymsLabel}>Antonyms: </Text>
          {definition.antonyms.join(', ')}
        </Text>
      )}
    </View>
  );

  const MeaningSection = ({ meaning, index }: { meaning: Meaning; index: number }) => (
    <View key={index} style={styles.meaningContainer}>
      <View style={styles.partOfSpeechContainer}>
        <Text style={styles.partOfSpeechText}>{meaning.partOfSpeech}</Text>
      </View>
      
      {meaning.definitions.slice(0, 3).map((definition, defIndex) => (
        <DefinitionItem key={defIndex} definition={definition} index={defIndex} />
      ))}
    </View>
  );

  const PhoneticItem = ({ phonetic, index }: { phonetic: Phonetic; index: number }) => (
    <View key={index} style={styles.phoneticItem}>
      {phonetic.text && (
        <Text style={styles.phoneticItemText}>/{phonetic.text}/</Text>
      )}
      {phonetic.audio && (
        <TouchableOpacity
          style={styles.phoneticAudioButton}
          onPress={() => playAudio(phonetic.audio!)}
        >
          <Ionicons name="volume-high" size={16} color="#2563eb" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="book" size={32} color="#2563eb" />
          <Text style={styles.headerTitle}>Dictionary</Text>
          <TouchableOpacity 
            style={styles.favoritesButton}
            onPress={() => Alert.alert('Favorites', favorites.join(', ') || 'No favorites yet')}
          >
            <Ionicons name="bookmark" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          Discover meanings, pronunciations, and examples
        </Text>
      </View>

      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter a word to search..."
            placeholderTextColor="#9ca3af"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      
      {searchHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Ionicons name="time" size={16} color="#6b7280" />
            <Text style={styles.historyTitle}>Recent Searches</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.historyTags}>
              {searchHistory.map((word, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.historyTag}
                  onPress={() => {
                    setSearchTerm(word);
                    searchWord(word);
                  }}
                >
                  <Text style={styles.historyTagText}>{word}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {wordData && (
          <View style={styles.wordContainer}>
            
            <View style={styles.wordHeader}>
              <View style={styles.wordTitleContainer}>
                <Text style={styles.wordTitle}>{wordData.word}</Text>
                {wordData.phonetic && (
                  <Text style={styles.phoneticText}>/{wordData.phonetic}/</Text>
                )}
              </View>
              
              <View style={styles.wordActions}>
                {wordData.phonetics.find(p => p.audio) && (
                  <TouchableOpacity
                    style={styles.audioButton}
                    onPress={() => {
                      const audioPhonetic = wordData.phonetics.find(p => p.audio);
                      if (audioPhonetic?.audio) playAudio(audioPhonetic.audio);
                    }}
                  >
                    <Ionicons name="volume-high" size={20} color="#2563eb" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => toggleFavorite(wordData.word)}
                >
                  <Ionicons 
                    name={favorites.includes(wordData.word) ? 'bookmark' : 'bookmark-outline'} 
                    size={20} 
                    color="#2563eb" 
                  />
                </TouchableOpacity>
              </View>
            </View>

    
            {wordData.origin && (
              <View style={styles.originContainer}>
                <Text style={styles.originTitle}>Origin</Text>
                <Text style={styles.originText}>{wordData.origin}</Text>
              </View>
            )}

    
            <View style={styles.meaningsContainer}>
              {wordData.meanings.map((meaning, index) => (
                <MeaningSection key={index} meaning={meaning} index={index} />
              ))}
            </View>

            
            {wordData.phonetics.length > 1 && (
              <View style={styles.phoneticsContainer}>
                <Text style={styles.phoneticsTitle}>Pronunciations</Text>
                <View style={styles.phoneticsList}>
                  {wordData.phonetics.map((phonetic, index) => (
                    <PhoneticItem key={index} phonetic={phonetic} index={index} />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by Free Dictionary API</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  favoritesButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  headerSubtitle: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  historyContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 4,
  },
  historyTags: {
    flexDirection: 'row',
    gap: 8,
  },
  historyTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  historyTagText: {
    color: '#374151',
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  wordContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  wordTitleContainer: {
    flex: 1,
  },
  wordTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  wordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneticText: {
    fontSize: 18,
    color: '#6b7280',
  },
  audioButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  originContainer: {
    marginBottom: 20,
  },
  originTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  originText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  meaningsContainer: {
    gap: 20,
  },
  meaningContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#dbeafe',
    paddingLeft: 16,
  },
  partOfSpeechContainer: {
    backgroundColor: '#f0f9ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 12,
  },
  partOfSpeechText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  definitionContainer: {
    marginBottom: 16,
  },
  definitionText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 6,
  },
  exampleLabel: {
    fontWeight: '600',
    fontStyle: 'normal',
  },
  synonymsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  synonymsLabel: {
    fontWeight: '600',
    color: '#059669',
  },
  antonymsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  antonymsLabel: {
    fontWeight: '600',
    color: '#dc2626',
  },
  phoneticsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  phoneticsList: {
    gap: 12,
  },
  phoneticsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  phoneticItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneticItemText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  phoneticAudioButton: {
    padding: 4,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
*/