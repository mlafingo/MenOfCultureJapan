/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VlogEpisode } from '../types/journey';
import rawEpisodesJson from './japanVlogsData.json';

/**
 * Single source of truth loaded directly from japanVlogsData.json.
 * To add, remove, or fix any stops, edit `src/data/japanVlogsData.json` directly.
 * Refer to README.md for instructions and JSON schema documentation.
 */
export const JAPAN_VLOGS_DATA: VlogEpisode[] = rawEpisodesJson as VlogEpisode[];
