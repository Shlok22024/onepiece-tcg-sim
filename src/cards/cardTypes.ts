export type CardId = string

export enum CardType {
  Leader = 'LEADER',
  Character = 'CHARACTER',
  Event = 'EVENT',
  Stage = 'STAGE',
  Don = 'DON',
}

export enum CardColor {
  Red = 'RED',
  Green = 'GREEN',
  Blue = 'BLUE',
  Purple = 'PURPLE',
  Black = 'BLACK',
  Yellow = 'YELLOW',
}

export enum CardRarity {
  Leader = 'LEADER',
  Common = 'COMMON',
  Uncommon = 'UNCOMMON',
  Rare = 'RARE',
  SuperRare = 'SUPER_RARE',
  SecretRare = 'SECRET_RARE',
  Promo = 'PROMO',
}

export interface Card {
  readonly id: CardId
  readonly code: string
  readonly name: string
  readonly type: CardType
  readonly colors: readonly CardColor[]
  readonly rarity: CardRarity
  readonly cost?: number
  readonly power?: number
  readonly counter?: number
  readonly life?: number
  readonly attribute?: string
  readonly text?: string
  readonly tags: readonly string[]
  readonly isPlaceholder: boolean
}
