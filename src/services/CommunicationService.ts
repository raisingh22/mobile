import { Linking, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

export class CommunicationService {
  /**
   * Opens native WhatsApp to send a pre-filled message.
   * @param phone Phone number (should include country code, e.g. +91...)
   * @param text The message to send
   */
  static async sendWhatsApp(phone: string, text: string) {
    try {
      // Clean phone number: keep only digits (remove +, spaces, dashes, etc.)
      const cleanedPhone = phone.replace(/\D/g, '');
      
      // Use the universal WhatsApp link (wa.me) which does not require LSApplicationQueriesSchemes in Info.plist
      const url = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(text)}`;
      
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not open WhatsApp' });
    }
  }

  /**
   * Opens native SMS app to send a pre-filled message.
   * @param phone Phone number
   * @param text The message to send
   */
  static async sendSMS(phone: string, text: string) {
    try {
      const cleanedPhone = phone.replace(/[^\d+]/g, '');
      const separator = Platform.OS === 'ios' ? '&' : '?';
      const url = `sms:${cleanedPhone}${separator}body=${encodeURIComponent(text)}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Toast.show({
          type: 'error',
          text1: 'SMS Not Available',
          text2: 'This device cannot send SMS.',
        });
      }
    } catch (error) {
      console.error('Error opening SMS:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not open SMS app' });
    }
  }

  /**
   * Opens native Email app to send an email.
   * @param email Recipient email
   * @param subject Email subject
   * @param body Email body
   */
  static async sendEmail(email: string, subject: string, body: string) {
    try {
      const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Email Not Configured',
          text2: 'Please set up an email client on this device.',
        });
      }
    } catch (error) {
      console.error('Error opening Email:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not open Email app' });
    }
  }
}
