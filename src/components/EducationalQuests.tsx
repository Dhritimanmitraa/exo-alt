import React, { useState, useEffect } from 'react';
import { Planet } from '../lib/filters';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  requirement: number;
  category: 'explorer' | 'scientist' | 'navigator' | 'researcher';
}

interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'discovery' | 'analysis' | 'exploration' | 'research';
  objectives: string[];
  completed: boolean;
  progress: number;
  maxProgress: number;
  reward: {
    xp: number;
    achievements?: string[];
  };
}

interface EducationalQuestsProps {
  planets: Planet[];
  isOpen: boolean;
  onClose: () => void;
  userStats: {
    planetsViewed: number;
    comparisonsCreated: number;
    missionsPlanned: number;
    newsRead: number;
    simulationsRun: number;
  };
}

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-planet',
    title: 'First Contact',
    description: 'View your first exoplanet details',
    icon: '🌍',
    unlocked: false,
    progress: 0,
    requirement: 1,
    category: 'explorer'
  },
  {
    id: 'planet-explorer',
    title: 'Planet Explorer',
    description: 'View details of 10 different exoplanets',
    icon: '🔭',
    unlocked: false,
    progress: 0,
    requirement: 10,
    category: 'explorer'
  },
  {
    id: 'comparison-master',
    title: 'Comparison Master',
    description: 'Create 5 planet comparisons',
    icon: '⚖️',
    unlocked: false,
    progress: 0,
    requirement: 5,
    category: 'scientist'
  },
  {
    id: 'mission-commander',
    title: 'Mission Commander',
    description: 'Plan 3 space missions',
    icon: '🚀',
    unlocked: false,
    progress: 0,
    requirement: 3,
    category: 'navigator'
  },
  {
    id: 'weather-watcher',
    title: 'Weather Watcher',
    description: 'Run 10 weather simulations',
    icon: '🌦️',
    unlocked: false,
    progress: 0,
    requirement: 10,
    category: 'researcher'
  },
  {
    id: 'news-reader',
    title: 'Cosmic News Reader',
    description: 'Read 15 exoplanet news articles',
    icon: '📰',
    unlocked: false,
    progress: 0,
    requirement: 15,
    category: 'researcher'
  },
  {
    id: 'habitable-hunter',
    title: 'Habitable Zone Hunter',
    description: 'Discover 5 potentially habitable planets',
    icon: '🌱',
    unlocked: false,
    progress: 0,
    requirement: 5,
    category: 'scientist'
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    description: 'Analyze data for 50 exoplanets',
    icon: '📊',
    unlocked: false,
    progress: 0,
    requirement: 50,
    category: 'scientist'
  }
];

const QUESTS: Quest[] = [
  {
    id: 'beginner-explorer',
    title: 'Beginner Explorer',
    description: 'Get started with exoplanet exploration',
    difficulty: 'beginner',
    category: 'discovery',
    objectives: [
      'View details of any exoplanet',
      'Use the search function to find a specific planet',
      'Apply a filter to view Earth-like planets'
    ],
    completed: false,
    progress: 0,
    maxProgress: 3,
    reward: {
      xp: 100,
      achievements: ['first-planet']
    }
  },
  {
    id: 'comparative-analysis',
    title: 'Comparative Analysis',
    description: 'Learn to compare different exoplanets',
    difficulty: 'intermediate',
    category: 'analysis',
    objectives: [
      'Open the Planet Comparison Tool',
      'Add at least 3 planets to comparison',
      'Export comparison data as CSV or JSON'
    ],
    completed: false,
    progress: 0,
    maxProgress: 3,
    reward: {
      xp: 200,
      achievements: ['comparison-master']
    }
  },
  {
    id: 'space-mission',
    title: 'Space Mission Planning',
    description: 'Plan your first interstellar mission',
    difficulty: 'intermediate',
    category: 'exploration',
    objectives: [
      'Open the Mission Planner',
      'Select a target exoplanet',
      'Choose propulsion technology and calculate travel time',
      'Review mission feasibility score'
    ],
    completed: false,
    progress: 0,
    maxProgress: 4,
    reward: {
      xp: 250,
      achievements: ['mission-commander']
    }
  },
  {
    id: 'atmospheric-studies',
    title: 'Atmospheric Studies',
    description: 'Study exoplanet atmospheres and weather',
    difficulty: 'advanced',
    category: 'research',
    objectives: [
      'Run weather simulation for a hot Jupiter',
      'Simulate weather for an Earth-like planet',
      'Observe atmospheric dynamics for 24+ simulated hours',
      'Study extreme weather events'
    ],
    completed: false,
    progress: 0,
    maxProgress: 4,
    reward: {
      xp: 300,
      achievements: ['weather-watcher']
    }
  },
  {
    id: 'cosmic-journalist',
    title: 'Cosmic Journalist',
    description: 'Stay updated with latest exoplanet discoveries',
    difficulty: 'beginner',
    category: 'research',
    objectives: [
      'Open the Exoplanet News Feed',
      'Read 5 different news articles',
      'Filter news by significance level',
      'View planet details from a news article'
    ],
    completed: false,
    progress: 0,
    maxProgress: 4,
    reward: {
      xp: 150,
      achievements: ['news-reader']
    }
  },
  {
    id: 'data-master',
    title: 'Data Master',
    description: 'Master exoplanet data analysis',
    difficulty: 'advanced',
    category: 'analysis',
    objectives: [
      'View data for 20+ different exoplanets',
      'Use all available filter categories',
      'Create 3+ planet comparisons',
      'Analyze correlations between planetary properties'
    ],
    completed: false,
    progress: 0,
    maxProgress: 4,
    reward: {
      xp: 400,
      achievements: ['data-scientist', 'habitable-hunter']
    }
  }
];

const EducationalQuests: React.FC<EducationalQuestsProps> = ({ 
  planets, 
  isOpen, 
  onClose, 
  userStats 
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [quests] = useState<Quest[]>(QUESTS);
  const [activeTab, setActiveTab] = useState<'quests' | 'achievements' | 'progress'>('quests');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [totalXP, setTotalXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);

  // Update achievements based on user stats
  useEffect(() => {
    setAchievements(prev => prev.map(achievement => {
      let progress = 0;
      switch (achievement.id) {
        case 'first-planet':
        case 'planet-explorer':
          progress = userStats.planetsViewed;
          break;
        case 'comparison-master':
          progress = userStats.comparisonsCreated;
          break;
        case 'mission-commander':
          progress = userStats.missionsPlanned;
          break;
        case 'weather-watcher':
          progress = userStats.simulationsRun;
          break;
        case 'news-reader':
          progress = userStats.newsRead;
          break;
        case 'habitable-hunter':
          progress = planets.filter(p => 
            p.pl_eqt && p.pl_eqt >= 273 && p.pl_eqt <= 373 &&
            p.pl_rade && p.pl_rade >= 0.5 && p.pl_rade <= 2.0
          ).length;
          break;
        case 'data-scientist':
          progress = userStats.planetsViewed;
          break;
        default:
          progress = achievement.progress;
      }

      return {
        ...achievement,
        progress: Math.min(progress, achievement.requirement),
        unlocked: progress >= achievement.requirement
      };
    }));
  }, [userStats, planets]);

  // Calculate level and XP
  useEffect(() => {
    const unlockedAchievements = achievements.filter(a => a.unlocked);
    const completedQuests = quests.filter(q => q.completed);
    
    const achievementXP = unlockedAchievements.length * 50;
    const questXP = completedQuests.reduce((sum, quest) => sum + quest.reward.xp, 0);
    const total = achievementXP + questXP;
    
    setTotalXP(total);
    setUserLevel(Math.floor(total / 500) + 1);
  }, [achievements, quests]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'discovery': return '🔍';
      case 'analysis': return '📊';
      case 'exploration': return '🚀';
      case 'research': return '🔬';
      default: return '⭐';
    }
  };

  const getAchievementCategoryColor = (category: string) => {
    switch (category) {
      case 'explorer': return 'border-blue-200 bg-blue-50';
      case 'scientist': return 'border-purple-200 bg-purple-50';
      case 'navigator': return 'border-green-200 bg-green-50';
      case 'researcher': return 'border-orange-200 bg-orange-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const filteredQuests = selectedDifficulty === 'all' 
    ? quests 
    : quests.filter(q => q.difficulty === selectedDifficulty);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Educational Quest System</h2>
              <p className="opacity-90">Level {userLevel} Explorer • {totalXP} XP</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress to Level {userLevel + 1}</span>
              <span>{totalXP % 500}/500 XP</span>
            </div>
            <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${(totalXP % 500) / 500 * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { key: 'quests', label: 'Active Quests', icon: '📋' },
              { key: 'achievements', label: 'Achievements', icon: '🏆' },
              { key: 'progress', label: 'Progress', icon: '📊' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'quests' && (
            <div>
              {/* Quest Filters */}
              <div className="mb-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Filter by difficulty:</span>
                  {['all', 'beginner', 'intermediate', 'advanced'].map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => setSelectedDifficulty(difficulty as any)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedDifficulty === difficulty
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quest List */}
              <div className="grid gap-6">
                {filteredQuests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`border rounded-lg p-6 transition-all ${
                      quest.completed 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getCategoryIcon(quest.category)}</span>
                          <h3 className="text-lg font-bold text-gray-900">{quest.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(quest.difficulty)}`}>
                            {quest.difficulty}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-4">{quest.description}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${quest.completed ? 'text-green-600' : 'text-gray-600'}`}>
                          {quest.completed ? '✅ Complete' : `${quest.progress}/${quest.maxProgress}`}
                        </div>
                        <div className="text-sm text-gray-500">+{quest.reward.xp} XP</div>
                      </div>
                    </div>

                    {/* Objectives */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Objectives:</h4>
                      <ul className="space-y-1">
                        {quest.objectives.map((objective, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              quest.progress > index 
                                ? 'border-green-500 bg-green-500' 
                                : 'border-gray-300'
                            }`}>
                              {quest.progress > index && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                            <span className={quest.progress > index ? 'text-gray-900' : 'text-gray-600'}>
                              {objective}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Progress Bar */}
                    {!quest.completed && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      achievement.unlocked 
                        ? `${getAchievementCategoryColor(achievement.category)} border-opacity-60` 
                        : 'border-gray-200 bg-gray-50 opacity-70'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`text-4xl mb-2 ${achievement.unlocked ? '' : 'grayscale'}`}>
                        {achievement.icon}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">{achievement.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
                      
                      <div className="mb-2">
                        <div className="text-sm text-gray-700 mb-1">
                          {achievement.progress}/{achievement.requirement}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              achievement.unlocked ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min((achievement.progress / achievement.requirement) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        achievement.unlocked 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {achievement.unlocked ? 'Unlocked' : achievement.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Overall Progress */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Your Exploration Journey</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{userStats.planetsViewed}</div>
                    <div className="text-sm text-gray-600">Planets Explored</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{userStats.comparisonsCreated}</div>
                    <div className="text-sm text-gray-600">Comparisons Made</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{userStats.missionsPlanned}</div>
                    <div className="text-sm text-gray-600">Missions Planned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{userStats.simulationsRun}</div>
                    <div className="text-sm text-gray-600">Simulations Run</div>
                  </div>
                </div>
              </div>

              {/* Achievement Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['explorer', 'scientist', 'navigator', 'researcher'].map((category) => {
                  const categoryAchievements = achievements.filter(a => a.category === category);
                  const unlockedCount = categoryAchievements.filter(a => a.unlocked).length;
                  
                  return (
                    <div key={category} className="border rounded-lg p-4">
                      <h4 className="text-lg font-bold text-gray-900 mb-3 capitalize">{category}</h4>
                      <div className="space-y-2">
                        {categoryAchievements.map((achievement) => (
                          <div key={achievement.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={achievement.unlocked ? '' : 'grayscale opacity-50'}>
                                {achievement.icon}
                              </span>
                              <span className="text-sm">{achievement.title}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              achievement.unlocked 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {achievement.progress}/{achievement.requirement}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Progress: {unlockedCount}/{categoryAchievements.length} achievements
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(unlockedCount / categoryAchievements.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EducationalQuests;