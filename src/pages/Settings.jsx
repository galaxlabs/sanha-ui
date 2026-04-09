import { useEffect, useRef, useState } from 'react';
import {
  Shield, Users, Settings as SettingsIcon, Database, AlertCircle,
  Upload, Image, Key, Lock, Eye, EyeOff, Check, X,
  RefreshCw, Save, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TRANSITIONS } from '../utils/workflow';
import {
  uploadLogoFile, savePortalLogoUrl, getPortalLogoUrl,
  adminSetPassword, updatePassword, listUsers,
} from '../api/frappe';
import { useToast } from '../contexts/ToastContext';

